import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  LinkedCalendar,
  LinkedCalendarDocument,
} from './schemas/linked-calendar.schema';
import { Contract } from '../contracts/schemas/contract.schema';
import { LinkedCalendarMapper } from './mappers/linked-calendar.mapper';
import { RelayCalendarClient } from './clients/relay-calendar.client';
import { RelayClientService } from '../../integrations/relay/client/relay-client.service';
import { UsersService } from '../users/users.service';

import type { LinkCalendarsDto } from './dto/link-calendars.dto';
import type { CreateCalendarDto } from './dto/create-calendar.dto';
import type { SubscribeByUrlDto } from './dto/subscribe-by-url.dto';
import type { SubscribeFromCatalogueDto } from './dto/subscribe-from-catalogue.dto';
import type { UpdateLinkedCalendarDto } from './dto/update-linked-calendar.dto';
import type { LinkedCalendarQueryDto } from './dto/linked-calendar-query.dto';
import type {
  LinkedCalendarResponseDto,
  CalendarOptionDto,
} from './dto/linked-calendar-response.dto';
import type { AvailableCalendarAccountResponseDto } from './dto/available-calendar-account-response.dto';
import type { AvailableCalendarResponseDto } from './dto/available-calendar-response.dto';
import type { CalendarFlow } from './schemas/linked-calendar.schema';
import {
  getCatalogueEntry,
  toSafeEntry,
  getCatalogueByCountry,
  getAvailableCatalogueEntries,
  type PublicCalendarSafeEntry,
} from './catalogue/public-calendar-catalogue';
import { CALENDAR_SETUP_DEFAULTS } from './catalogue/calendar-setup-constants';
import type { SetupCalendarDto } from './dto/setup-calendar.dto';
import type {
  SetupCalendarResponseDto,
  HolidayDiscoveryResponseDto,
  ProviderCalendarOptionDto,
  SetupAustralianHolidaysResponseDto,
} from './dto/linked-calendar-response.dto';
import type { DiscoverHolidaysDto } from './dto/discover-holidays.dto';
import type { LinkHolidayCalendarDto } from './dto/link-holiday-calendar.dto';

// ─── Holiday name patterns ────────────────────────────────────────────────────

const AU_HOLIDAY_NAME_PATTERNS = [
  /australian.*(public.*)?(holiday|holidays)/i,
  /australia.*(public.*)?(holiday|holidays)/i,
  /holidays?.*(australia|australian)/i,
];

export interface ActorContext {
  userId: string;
  email: string;
  firstName: string;
  companyId: string;
}

@Injectable()
export class LinkedCalendarsService {
  private readonly logger = new Logger(LinkedCalendarsService.name);

  constructor(
    @InjectModel(LinkedCalendar.name)
    private readonly model: Model<LinkedCalendarDocument>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<any>,
    private readonly calendarClient: RelayCalendarClient,
    private readonly commClient: RelayClientService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findOrThrow(
    id: string,
    companyId: string,
  ): Promise<LinkedCalendarDocument> {
    const doc = await this.model.findOne({ _id: id, companyId }).lean().exec();
    if (!doc) throw new NotFoundException('Linked calendar not found');
    return doc;
  }

  private async sendNotification(
    actor: ActorContext,
    event: string,
    data: Record<string, string | undefined | null>,
  ): Promise<void> {
    try {
      const businessName = await this.usersService
        .getCompanyDisplayName(actor.companyId)
        .catch(() => actor.companyId);

      const delivered = await this.commClient.notifyEvent({
        type: 'business',
        businessId: actor.companyId,
        event,
        email: actor.email,
        data: {
          firstName: actor.firstName,
          businessName,
          actionDate: new Date().toISOString(),
          linkedCalendarsUrl: '/settings/calendar',
          ...data,
        },
      });

      this.logger.log(
        `[notification] ${event} → ${actor.email} delivered=${delivered}`,
      );
    } catch (err: any) {
      this.logger.error(`[notification] ${event} FAILED: ${err?.message}`);
    }
  }

  // ─── Available accounts ───────────────────────────────────────────────────

  async listAvailableAccounts(
    companyId: string,
  ): Promise<AvailableCalendarAccountResponseDto[]> {
    return this.calendarClient.listCalendarAccounts(companyId);
  }

  // ─── Available calendars (from Relay + isLinked overlay) ─────────

  async listAvailableCalendars(
    companyId: string,
    connectionId: string,
  ): Promise<AvailableCalendarResponseDto[]> {
    const [remote, linked] = await Promise.all([
      this.calendarClient.listCalendars(companyId, connectionId),
      this.model
        .find({ companyId, connectionId })
        .select('externalCalendarId calendarName status _id')
        .lean()
        .exec(),
    ]);

    // Primary key: externalCalendarId (stable provider identity, scoped to this connectionId).
    const linkedIds = new Set(
      (linked as any[]).map((l) => l.externalCalendarId),
    );

    // Fallback key: calendarName (lowercase), used when stored externalCalendarId is a legacy
    // account-level CalDAV URL instead of the per-calendar HREF that the provider now returns.
    // Within a single connectionId, calendar names are unique, so this is a safe fallback.
    const linkedNames = new Set(
      (linked as any[]).map(
        (l) =>
          (l.calendarName as string | undefined)?.toLowerCase().trim() ?? '',
      ),
    );

    // Return ONLY provider calendars that are not yet linked.
    // isLinked is always false here; the field is kept for type compatibility.
    return remote
      .filter(
        (cal) =>
          !linkedIds.has(cal.externalCalendarId) &&
          !linkedNames.has((cal.calendarName ?? '').toLowerCase().trim()),
      )
      .map((cal) => ({
        ...cal,
        isLinked: false,
        linkedCalendarId: null,
        linkedStatus: null,
      }));
  }

  // ─── List linked calendars ────────────────────────────────────────────────

  async findAll(
    companyId: string,
    query: LinkedCalendarQueryDto,
  ): Promise<LinkedCalendarResponseDto[]> {
    const filter: Record<string, any> = { companyId };
    if (query.connectionId) filter.connectionId = query.connectionId;
    if (query.providerKey) filter.providerKey = query.providerKey;
    if (query.status) filter.status = query.status;
    if (query.flow) filter.flow = query.flow;
    if (query.search) {
      const re = new RegExp(query.search, 'i');
      filter.$or = [
        { calendarName: re },
        { accountIdentifier: re },
        { providerKey: re },
      ];
    }

    const docs = await this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return LinkedCalendarMapper.toResponseList(docs as any[]);
  }

  // ─── Get one linked calendar ──────────────────────────────────────────────

  async findById(
    id: string,
    companyId: string,
  ): Promise<LinkedCalendarResponseDto> {
    const doc = await this.findOrThrow(id, companyId);
    return LinkedCalendarMapper.toResponse(doc);
  }

  // ─── Link selected calendars ──────────────────────────────────────────────

  async linkCalendars(
    companyId: string,
    dto: LinkCalendarsDto,
    actor: ActorContext,
  ): Promise<LinkedCalendarResponseDto[]> {
    // 1. Get authoritative account info from Relay
    const account = await this.calendarClient.getCalendarAccount(
      companyId,
      dto.connectionId,
    );
    if (!account) {
      throw new BadRequestException(
        `Calendar account '${dto.connectionId}' was not found in Relay or does not belong to this Business.`,
      );
    }

    // 2. Get authoritative calendar list from Relay
    const remoteCals = await this.calendarClient.listCalendars(
      companyId,
      dto.connectionId,
    );
    const remoteMap = new Map(remoteCals.map((c) => [c.externalCalendarId, c]));

    // 3. Validate every requested calendarId
    const invalidIds = dto.calendarIds.filter((id) => !remoteMap.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `The following calendar IDs were not found in the selected account: ${invalidIds.join(', ')}`,
      );
    }

    // 4. Upsert each calendar — provider metadata always comes from Relay
    const results: LinkedCalendarDocument[] = [];
    let newlyLinked = 0;
    let reactivated = 0;

    for (const calId of dto.calendarIds) {
      const remote = remoteMap.get(calId)!;

      const $set: Record<string, any> = {
        providerKey: account.providerKey,
        providerDisplayName: account.providerDisplayName,
        accountIdentifier: account.accountIdentifier,
        calendarName: remote.calendarName,
        calendarDescription: remote.calendarDescription,
        timezone: remote.timezone,
        accessRole: remote.accessRole,
        isPrimary: remote.isPrimary,
        linkedByUserId: actor.userId,
      };
      if (dto.flow !== undefined) {
        $set.flow = dto.flow;
      }

      const doc = await this.model
        .findOneAndUpdate(
          {
            companyId,
            connectionId: dto.connectionId,
            externalCalendarId: calId,
          },
          {
            $set,
            $setOnInsert: {
              companyId,
              connectionId: dto.connectionId,
              externalCalendarId: calId,
              status: 'active',
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .lean()
        .exec();

      // Count new vs reactivated
      const existing = (await this.model
        .findOne({
          companyId,
          connectionId: dto.connectionId,
          externalCalendarId: calId,
        })
        .select('status createdAt updatedAt')
        .lean()
        .exec()) as any;

      const wasJustCreated =
        existing &&
        Math.abs(
          new Date(existing.createdAt).getTime() -
            new Date(existing.updatedAt).getTime(),
        ) < 100;

      if (wasJustCreated) {
        newlyLinked++;
      } else if (existing?.status === 'paused') {
        reactivated++;
        await this.model
          .updateOne(
            {
              companyId,
              connectionId: dto.connectionId,
              externalCalendarId: calId,
            },
            { $set: { status: 'active' } },
          )
          .exec();
      } else {
        newlyLinked++;
      }

      results.push(doc);
    }

    // 5. Send notification (fire-and-forget)
    const totalNew = newlyLinked + reactivated;
    if (totalNew === 1) {
      const cal = remoteMap.get(dto.calendarIds[0])!;
      const event =
        reactivated > 0
          ? 'linked_calendars.calendar_activated'
          : 'linked_calendars.calendar_linked';

      this.sendNotification(actor, event, {
        accountIdentifier: account.accountIdentifier,
        providerName: account.providerDisplayName,
        calendarName: cal.calendarName,
        calendarDescription: cal.calendarDescription ?? undefined,
        timezone: cal.timezone ?? undefined,
        accessRole: cal.accessRole ?? undefined,
      });
    } else if (totalNew > 1) {
      this.sendNotification(actor, 'linked_calendars.calendars_bulk_linked', {
        accountIdentifier: account.accountIdentifier,
        providerName: account.providerDisplayName,
        calendarCount: String(totalNew),
        calendarNames: dto.calendarIds
          .map((id) => remoteMap.get(id)?.calendarName ?? id)
          .join(', '),
      });
    }

    return LinkedCalendarMapper.toResponseList(results as any[]);
  }

  // ─── Create a new calendar in the provider and immediately link it ───────

  async createAndLinkCalendar(
    companyId: string,
    dto: CreateCalendarDto,
    actor: ActorContext,
  ): Promise<LinkedCalendarResponseDto> {
    // 1. Validate account ownership
    const account = await this.calendarClient.getCalendarAccount(
      companyId,
      dto.connectionId,
    );
    if (!account) {
      throw new BadRequestException(
        `Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`,
      );
    }

    // 2. Create in provider via Relay
    const created = await this.calendarClient.createCalendar(
      companyId,
      dto.connectionId,
      {
        name: dto.name.trim(),
        description: dto.description?.trim(),
      },
    );

    // 3. Upsert into linked_calendars via shared helper
    const result = await this.upsertLinkedCalendar({
      companyId,
      connectionId: dto.connectionId,
      account,
      remote: created,
      flow: dto.flow,
      actor,
    });

    this.sendNotification(actor, 'linked_calendars.calendar_linked', {
      accountIdentifier: account.accountIdentifier,
      providerName: account.providerDisplayName,
      calendarName: created.calendarName,
      calendarDescription: created.calendarDescription ?? undefined,
    });

    return result;
  }

  // ─── Shared link-upsert helper ───────────────────────────────────────────

  /**
   * Upsert a linked-calendar record from remote metadata.
   * Returns the new/updated document. Throws if the record was just created but
   * the metadata write failed (compensating cleanup note: the provider-side
   * calendar/subscription will exist but won't be tracked — logged at ERROR level
   * so ops can clean up manually if needed).
   */
  private async upsertLinkedCalendar(params: {
    companyId: string;
    connectionId: string;
    account: AvailableCalendarAccountResponseDto;
    remote: {
      externalCalendarId: string;
      calendarName: string;
      calendarDescription: string | null;
      timezone: string | null;
      accessRole: string | null;
      isPrimary: boolean;
    };
    flow: CalendarFlow;
    actor: ActorContext;
  }): Promise<LinkedCalendarResponseDto> {
    const { companyId, connectionId, account, remote, flow, actor } = params;

    // Detect pre-existing link for this Business + connection + external ID
    const existing = (await this.model
      .findOne({
        companyId,
        connectionId,
        externalCalendarId: remote.externalCalendarId,
      })
      .select('_id calendarName flow status')
      .lean()
      .exec()) as any;

    if (existing) {
      // Already linked — return existing record with updated metadata
      const updated = await this.model
        .findOneAndUpdate(
          { _id: existing._id, companyId },
          {
            $set: {
              calendarName: remote.calendarName,
              calendarDescription: remote.calendarDescription,
              timezone: remote.timezone,
              accessRole: remote.accessRole,
              isPrimary: remote.isPrimary,
              flow,
              linkedByUserId: actor.userId,
            },
          },
          { new: true },
        )
        .lean()
        .exec();
      return LinkedCalendarMapper.toResponse(updated as any);
    }

    const doc = await this.model
      .findOneAndUpdate(
        {
          companyId,
          connectionId,
          externalCalendarId: remote.externalCalendarId,
        },
        {
          $set: {
            providerKey: account.providerKey,
            providerDisplayName: account.providerDisplayName,
            accountIdentifier: account.accountIdentifier,
            calendarName: remote.calendarName,
            calendarDescription: remote.calendarDescription,
            timezone: remote.timezone,
            accessRole: remote.accessRole,
            isPrimary: remote.isPrimary,
            flow,
            linkedByUserId: actor.userId,
          },
          $setOnInsert: {
            companyId,
            connectionId,
            externalCalendarId: remote.externalCalendarId,
            status: 'active',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec();

    if (!doc) {
      this.logger.error(
        `[upsertLinkedCalendar] Upsert returned null for companyId=${companyId} ` +
          `connectionId=${connectionId} externalCalendarId=${remote.externalCalendarId}. ` +
          `Provider-side calendar may exist without a local record — manual cleanup may be required.`,
      );
      throw new BadRequestException(
        'Calendar was created in the provider but could not be saved to Business App. ' +
          'Please contact support with the calendar name and account details.',
      );
    }

    return LinkedCalendarMapper.toResponse(doc as any);
  }

  // ─── Subscribe by URL ─────────────────────────────────────────────────────

  async subscribeByUrl(
    companyId: string,
    dto: SubscribeByUrlDto,
    actor: ActorContext,
  ): Promise<LinkedCalendarResponseDto> {
    const account = await this.calendarClient.getCalendarAccount(
      companyId,
      dto.connectionId,
    );
    if (!account) {
      throw new BadRequestException(
        `Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`,
      );
    }

    const subscribed = await this.calendarClient.subscribeToUrl(
      companyId,
      dto.connectionId,
      {
        url: dto.subscriptionUrl,
        name: dto.calendarName?.trim(),
        description: dto.description?.trim(),
      },
    );

    const result = await this.upsertLinkedCalendar({
      companyId,
      connectionId: dto.connectionId,
      account,
      remote: subscribed,
      flow: dto.flow,
      actor,
    });

    this.sendNotification(actor, 'linked_calendars.calendar_linked', {
      accountIdentifier: account.accountIdentifier,
      providerName: account.providerDisplayName,
      calendarName: subscribed.calendarName,
    });

    return result;
  }

  // ─── Subscribe from catalogue ─────────────────────────────────────────────

  async subscribeFromCatalogue(
    companyId: string,
    dto: SubscribeFromCatalogueDto,
    actor: ActorContext,
  ): Promise<LinkedCalendarResponseDto> {
    const entry = getCatalogueEntry(dto.catalogueKey);
    if (!entry) {
      throw new BadRequestException(
        `Unknown catalogue key: '${dto.catalogueKey}'`,
      );
    }
    if (!entry.available || !entry.subscriptionUrl) {
      throw new BadRequestException(
        `The calendar "${entry.displayName}" is not currently available for subscription.`,
      );
    }

    const account = await this.calendarClient.getCalendarAccount(
      companyId,
      dto.connectionId,
    );
    if (!account) {
      throw new BadRequestException(
        `Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`,
      );
    }

    const subscribed = await this.calendarClient.subscribeToUrl(
      companyId,
      dto.connectionId,
      {
        url: entry.subscriptionUrl,
        name: entry.displayName,
      },
    );

    const result = await this.upsertLinkedCalendar({
      companyId,
      connectionId: dto.connectionId,
      account,
      remote: subscribed,
      flow: dto.flow,
      actor,
    });

    this.sendNotification(actor, 'linked_calendars.calendar_linked', {
      accountIdentifier: account.accountIdentifier,
      providerName: account.providerDisplayName,
      calendarName: entry.displayName,
    });

    return result;
  }

  // ─── Catalogue accessors ──────────────────────────────────────────────────

  getCatalogueForCountry(country: string): PublicCalendarSafeEntry[] {
    return getCatalogueByCountry(country).map(toSafeEntry);
  }

  // ─── One-click calendar setup ─────────────────────────────────────────────

  /** Convert a LinkedCalendarResponseDto to the safe CalendarOptionDto shape. */
  private toCalendarOption(
    dto: LinkedCalendarResponseDto,
    wasExisting: boolean,
  ): SetupCalendarResponseDto {
    return {
      id: dto.id,
      calendarName: dto.calendarName,
      accountIdentifier: dto.accountIdentifier,
      providerDisplayName: dto.providerDisplayName,
      flow: dto.flow,
      status: dto.status,
      accessRole: dto.accessRole ?? null,
      wasExisting,
    };
  }

  /**
   * Idempotent one-click payment calendar setup.
   * If an active calendar with flow=payments already exists, returns it.
   * Otherwise creates a new provider calendar and links it.
   */
  async setupPaymentCalendar(
    companyId: string,
    dto: SetupCalendarDto,
    actor: ActorContext,
  ): Promise<SetupCalendarResponseDto> {
    // Idempotency: return existing active payments calendar if one exists
    const existing = (await this.model
      .findOne({ companyId, flow: 'payments', status: 'active' })
      .lean()
      .exec()) as any;

    if (existing) {
      return this.toCalendarOption(
        LinkedCalendarMapper.toResponse(existing),
        true,
      );
    }

    // Validate account ownership
    const account = await this.calendarClient.getCalendarAccount(
      companyId,
      dto.connectionId,
    );
    if (!account) {
      throw new BadRequestException(
        'Calendar account not found or does not belong to this Business.',
      );
    }

    // Create the provider calendar
    let created: Awaited<ReturnType<typeof this.calendarClient.createCalendar>>;
    try {
      created = await this.calendarClient.createCalendar(
        companyId,
        dto.connectionId,
        {
          name: CALENDAR_SETUP_DEFAULTS.PAYMENT_CALENDAR_NAME,
          description: CALENDAR_SETUP_DEFAULTS.PAYMENT_CALENDAR_DESCRIPTION,
        },
      );
    } catch (err: any) {
      this.logger.error(
        `[setupPaymentCalendar] Provider calendar creation failed: ${err?.message}`,
      );
      throw new BadRequestException(
        `Could not create the payment calendar in the provider: ${
          err?.message ?? 'Provider request failed'
        }`,
      );
    }

    const linked = await this.upsertLinkedCalendar({
      companyId,
      connectionId: dto.connectionId,
      account,
      remote: created,
      flow: 'payments',
      actor,
    });

    this.sendNotification(actor, 'linked_calendars.calendar_linked', {
      accountIdentifier: account.accountIdentifier,
      providerName: account.providerDisplayName,
      calendarName: created.calendarName,
      calendarDescription: created.calendarDescription ?? undefined,
    });

    return this.toCalendarOption(linked, false);
  }

  /**
   * Idempotent one-click Australian public holiday calendar setup.
   * If an active calendar with flow=holidays already exists, returns it.
   * Otherwise subscribes to the verified AU national holiday calendar and links it.
   * Returns 'assisted_setup_required' when the provider returns 422 (capability not supported).
   */
  async setupAustralianHolidays(
    companyId: string,
    dto: SetupCalendarDto,
    actor: ActorContext,
  ): Promise<SetupAustralianHolidaysResponseDto> {
    // Idempotency: return existing active holidays calendar if one exists
    const existing = (await this.model
      .findOne({ companyId, flow: 'holidays', status: 'active' })
      .lean()
      .exec()) as any;

    if (existing) {
      return {
        status: 'linked',
        calendar: this.toCalendarOption(
          LinkedCalendarMapper.toResponse(existing),
          true,
        ),
      };
    }

    // Validate account ownership
    const account = await this.calendarClient.getCalendarAccount(
      companyId,
      dto.connectionId,
    );
    if (!account) {
      throw new BadRequestException(
        'Calendar account not found or does not belong to this Business.',
      );
    }

    // Resolve verified catalogue entry — do NOT fabricate a URL
    const entry = getCatalogueEntry(
      CALENDAR_SETUP_DEFAULTS.AU_HOLIDAY_CATALOGUE_KEY,
    );
    if (!entry || !entry.available || !entry.subscriptionUrl) {
      throw new BadRequestException(
        CALENDAR_SETUP_DEFAULTS.AU_HOLIDAY_UNAVAILABLE_MESSAGE,
      );
    }

    // Subscribe via provider
    let subscribed: Awaited<
      ReturnType<typeof this.calendarClient.subscribeToUrl>
    >;
    try {
      subscribed = await this.calendarClient.subscribeToUrl(
        companyId,
        dto.connectionId,
        {
          url: entry.subscriptionUrl,
          name: entry.displayName,
        },
      );
    } catch (err: any) {
      const reason =
        err?.message ?? CALENDAR_SETUP_DEFAULTS.AU_HOLIDAY_UNAVAILABLE_MESSAGE;
      this.logger.error(
        `[setupAustralianHolidays] Provider subscription failed connectionId=${dto.connectionId}: ${reason}`,
      );

      if (err instanceof UnprocessableEntityException) {
        // Provider explicitly confirmed it cannot subscribe to this URL (422).
        // This is a valid business state — guide the user through manual setup.
        return {
          status: 'assisted_setup_required',
          provider: account.providerKey,
          connectionId: dto.connectionId,
          instructionsType:
            account.providerKey === 'icloud'
              ? 'apple_holiday_calendar'
              : 'generic_holiday_calendar',
        };
      }

      if (err instanceof ServiceUnavailableException) {
        // Relay or provider is temporarily unreachable — propagate as 503.
        throw new ServiceUnavailableException(
          'The calendar service is temporarily unavailable. Please try again later.',
        );
      }

      // Any other error (400 bad request, unexpected) — re-throw as-is.
      throw err;
    }

    const linked = await this.upsertLinkedCalendar({
      companyId,
      connectionId: dto.connectionId,
      account,
      remote: subscribed,
      flow: 'holidays',
      actor,
    });

    this.sendNotification(actor, 'linked_calendars.calendar_linked', {
      accountIdentifier: account.accountIdentifier,
      providerName: account.providerDisplayName,
      calendarName: entry.displayName,
    });

    return { status: 'linked', calendar: this.toCalendarOption(linked, false) };
  }

  /**
   * Discover unlinked Australian holiday calendars from the provider after manual setup.
   * Returns 'linked' if already tracked, 'multiple_matches' if ambiguous, or 'not_found'.
   */
  async discoverAustralianHolidays(
    companyId: string,
    dto: DiscoverHolidaysDto,
    actor: ActorContext,
  ): Promise<HolidayDiscoveryResponseDto> {
    // Idempotency: already have an active holiday calendar
    const existingHoliday = (await this.model
      .findOne({ companyId, flow: 'holidays', status: 'active' })
      .lean()
      .exec()) as any;

    if (existingHoliday) {
      return {
        status: 'linked',
        calendar: this.toCalendarOption(
          LinkedCalendarMapper.toResponse(existingHoliday),
          true,
        ),
      };
    }

    // Validate account ownership
    const account = await this.calendarClient.getCalendarAccount(
      companyId,
      dto.connectionId,
    );
    if (!account) {
      throw new BadRequestException(
        `Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`,
      );
    }

    // Fetch all provider calendars for this connection
    const providerCals = await this.calendarClient.listCalendars(
      companyId,
      dto.connectionId,
    );

    // Fetch already-linked calendars for this connection
    const linkedDocs = (await this.model
      .find({ companyId, connectionId: dto.connectionId })
      .lean()
      .exec()) as any[];

    const linkedIds = new Set(linkedDocs.map((d) => d.externalCalendarId));

    // Filter to unlinked provider calendars only
    const unlinked = providerCals.filter(
      (c) => !linkedIds.has(c.externalCalendarId),
    );

    // Detect holiday candidates by name pattern
    const candidates = unlinked.filter((c) =>
      AU_HOLIDAY_NAME_PATTERNS.some((re) => re.test(c.calendarName)),
    );

    if (candidates.length === 0) {
      return { status: 'not_found', options: [] };
    }

    if (candidates.length === 1) {
      // Auto-link single match with flow=holidays
      const linked = await this.upsertLinkedCalendar({
        companyId,
        connectionId: dto.connectionId,
        account,
        remote: candidates[0],
        flow: 'holidays',
        actor,
      });

      this.sendNotification(actor, 'linked_calendars.calendar_linked', {
        accountIdentifier: account.accountIdentifier,
        providerName: account.providerDisplayName,
        calendarName: candidates[0].calendarName,
      });

      return {
        status: 'linked',
        calendar: this.toCalendarOption(linked, false),
      };
    }

    // Multiple candidates — let the user choose
    const options: ProviderCalendarOptionDto[] = candidates.map((c) => ({
      externalCalendarId: c.externalCalendarId,
      calendarName: c.calendarName,
      calendarDescription: c.calendarDescription,
      timezone: c.timezone,
      accessRole: c.accessRole,
      isPrimary: c.isPrimary,
    }));

    return { status: 'multiple_matches', options };
  }

  /**
   * Validate and link a specific provider calendar with forced flow=holidays.
   */
  async linkProviderCalendarAsHoliday(
    companyId: string,
    dto: LinkHolidayCalendarDto,
    actor: ActorContext,
  ): Promise<SetupAustralianHolidaysResponseDto> {
    // Idempotency: already have an active holiday calendar
    const existingHoliday = (await this.model
      .findOne({ companyId, flow: 'holidays', status: 'active' })
      .lean()
      .exec()) as any;

    if (existingHoliday) {
      return {
        status: 'linked',
        calendar: this.toCalendarOption(
          LinkedCalendarMapper.toResponse(existingHoliday),
          true,
        ),
      };
    }

    // Validate account ownership
    const account = await this.calendarClient.getCalendarAccount(
      companyId,
      dto.connectionId,
    );
    if (!account) {
      throw new BadRequestException(
        `Calendar account '${dto.connectionId}' was not found or does not belong to this Business.`,
      );
    }

    // Validate that the externalCalendarId exists in the provider's calendar list
    const providerCals = await this.calendarClient.listCalendars(
      companyId,
      dto.connectionId,
    );
    const target = providerCals.find(
      (c) => c.externalCalendarId === dto.externalCalendarId,
    );
    if (!target) {
      throw new BadRequestException(
        `Calendar '${dto.externalCalendarId}' was not found in the selected account.`,
      );
    }

    // Always force flow=holidays — never trust the frontend
    const linked = await this.upsertLinkedCalendar({
      companyId,
      connectionId: dto.connectionId,
      account,
      remote: target,
      flow: 'holidays',
      actor,
    });

    this.sendNotification(actor, 'linked_calendars.calendar_linked', {
      accountIdentifier: account.accountIdentifier,
      providerName: account.providerDisplayName,
      calendarName: target.calendarName,
    });

    return { status: 'linked', calendar: this.toCalendarOption(linked, false) };
  }

  // ─── Update (status and/or flow) ─────────────────────────────────────────

  async updateStatus(
    id: string,
    companyId: string,
    dto: UpdateLinkedCalendarDto,
    actor: ActorContext,
  ): Promise<LinkedCalendarResponseDto> {
    const doc = await this.findOrThrow(id, companyId);
    const oldStatus = (doc as any).status;

    const $set: Record<string, any> = {};
    if (dto.status !== undefined && dto.status !== oldStatus) {
      $set.status = dto.status;
    }
    if (dto.flow !== undefined) {
      $set.flow = dto.flow;
    }

    // Nothing to change
    if (Object.keys($set).length === 0) {
      return LinkedCalendarMapper.toResponse(doc);
    }

    const updated = await this.model
      .findOneAndUpdate({ _id: id, companyId }, { $set }, { new: true })
      .lean()
      .exec();

    const result = LinkedCalendarMapper.toResponse(updated as any);

    // Status-change notification only
    if ($set.status) {
      const event =
        $set.status === 'active'
          ? 'linked_calendars.calendar_activated'
          : 'linked_calendars.calendar_paused';

      this.sendNotification(actor, event, {
        accountIdentifier: (doc as any).accountIdentifier,
        providerName: (doc as any).providerDisplayName,
        calendarName: (doc as any).calendarName,
      });
    }

    return result;
  }

  // ─── Calendar options (safe, flow-filtered) ───────────────────────────────

  async getOptions(
    companyId: string,
    flow: CalendarFlow,
  ): Promise<CalendarOptionDto[]> {
    const docs = await this.model
      .find({ companyId, flow, status: 'active' })
      .select(
        '_id calendarName accountIdentifier providerDisplayName flow status accessRole',
      )
      .sort({ calendarName: 1 })
      .lean()
      .exec();

    return (docs as any[]).map((d) => ({
      id: String(d._id),
      calendarName: d.calendarName,
      accountIdentifier: d.accountIdentifier,
      providerDisplayName: d.providerDisplayName,
      flow: d.flow,
      status: d.status,
      accessRole: d.accessRole ?? null,
    }));
  }

  async activate(
    id: string,
    companyId: string,
    actor: ActorContext,
  ): Promise<LinkedCalendarResponseDto> {
    return this.updateStatus(id, companyId, { status: 'active' }, actor);
  }

  async pause(
    id: string,
    companyId: string,
    actor: ActorContext,
  ): Promise<LinkedCalendarResponseDto> {
    return this.updateStatus(id, companyId, { status: 'paused' }, actor);
  }

  // ─── Unlink ───────────────────────────────────────────────────────────────

  async unlink(
    id: string,
    companyId: string,
    actor: ActorContext,
  ): Promise<{ deleted: boolean }> {
    const doc = await this.findOrThrow(id, companyId);

    // Block unlink when any contract (regardless of status) still references this calendar.
    // companyId maps to businessId in the Contracts collection.
    const referencingContract = await this.contractModel
      .findOne({
        businessId: companyId,
        $or: [
          { 'holidayRules.calendarId': id },
          { paymentCalendarSubscriptionId: id },
        ],
      })
      .select('_id')
      .lean()
      .exec();

    if (referencingContract) {
      throw new BadRequestException(
        'This calendar is currently used by one or more Contracts. Remove or replace it in those Contracts before removing the link.',
      );
    }

    await this.model.deleteOne({ _id: id, companyId }).exec();

    this.sendNotification(actor, 'linked_calendars.calendar_unlinked', {
      accountIdentifier: (doc as any).accountIdentifier,
      providerName: (doc as any).providerDisplayName,
      calendarName: (doc as any).calendarName,
    });

    return { deleted: true };
  }
}
