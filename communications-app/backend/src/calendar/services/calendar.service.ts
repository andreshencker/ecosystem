// src/calendar/services/calendar.service.ts

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Channel,
  ChannelDocument,
} from '../../communication/channels/channels-catalogue/schemas/channel-catalog.schema';
import {
  Provider,
  ProviderDocument,
} from '../../communication/channels/providers/schemas/provider.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';

import { ChannelsRuntimeResolverService } from '../../communication/channels/runtime/channels-runtime-resolver.service';
import { ProviderCredentialsService } from '../../communication/channels/provider-credentials/provider-credentials.service';
import { CompanyChannelProvidersService } from '../../communication/channels/company-channel-providers/company-channel-providers.service';
import { CalendarImplementationFactory } from '../factory/calendar-implementation.factory';

import type { ICalendarProvider } from '../interfaces/calendar-provider.interface';
import type { CalendarOperationResult } from '../types/calendar-provider.types';

import type { ConnectCalendarDto } from '../dto/connect-calendar.dto';
import type {
  CreateCalendarResourceDto,
  UpdateCalendarResourceDto,
  SubscribeCalendarDto,
  CreateEventDto,
  UpdateEventDto,
  ListEventsQueryDto,
} from '../dto/calendar-operation.dto';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    private readonly runtimeResolver: ChannelsRuntimeResolverService,
    private readonly credentialsService: ProviderCredentialsService,
    private readonly ccpService: CompanyChannelProvidersService,
    private readonly calendarFactory: CalendarImplementationFactory,
  ) {}

  // ─── Connection management ────────────────────────────────────────────────

  async connect(companyId: string, dto: ConnectCalendarDto): Promise<any> {
    // 1. Find the calendar channel
    const channel = await this.channelModel
      .findOne({ channelKey: 'calendar' })
      .lean();
    if (!channel) {
      throw new NotFoundException('Calendar channel not configured');
    }

    // 2. Find the provider
    const provider = await this.providerModel
      .findOne({ providerKey: dto.providerKey, isActive: true })
      .lean();
    if (!provider) {
      throw new NotFoundException(`Provider '${dto.providerKey}' not found`);
    }

    // 3. Find or create CompanyChannelProvider
    let ccp = await this.ccpModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        providerId: (provider as any)._id,
      })
      .lean();

    if (!ccp) {
      await this.ccpService.create({
        companyId,
        providerId: String((provider as any)._id),
        channelId: String((channel as any)._id),
        isDefault: false,
        isActive: true,
      });

      ccp = await this.ccpModel
        .findOne({
          companyId: new Types.ObjectId(companyId),
          providerId: (provider as any)._id,
        })
        .lean();
    }

    if (!ccp) {
      throw new BadRequestException(
        'Could not create or find CompanyChannelProvider',
      );
    }

    // 4. Create ProviderCredentials (validates + verifies + encrypts)
    const result = await this.credentialsService.create({
      companyChannelProviderId: String((ccp as any)._id),
      tag: dto.tag ?? 'default',
      credentials: dto.credentials,
    });

    return result;
  }

  async listConnections(companyId: string): Promise<any> {
    // Resolve the calendar channel so we can restrict results to calendar CCPs only.
    // This prevents email/sms/storage credentials from leaking into the selector.
    const calendarChannel = await this.channelModel
      .findOne({ channelKey: 'calendar' })
      .select('_id')
      .lean();

    if (!calendarChannel) {
      return { data: [], total: 0, limit: 50, offset: 0 };
    }

    return this.credentialsService.findAllByCompany({
      companyId,
      channelId: String((calendarChannel as any)._id),
      active: true,
    });
  }

  async disconnect(
    companyId: string,
    credentialsId: string,
  ): Promise<{ deleted: boolean }> {
    // Validate ownership — throws 404 if credential doesn't belong to this company
    await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: credentialsId,
    });
    return this.credentialsService.remove(credentialsId);
  }

  async testConnection(companyId: string, credentialsId: string): Promise<any> {
    const resolved = await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: credentialsId,
    });
    const provider = this.calendarFactory.getCalendarProvider(
      resolved.providerKey,
    );
    const result = await provider.verifyCredentials(resolved.credentials);
    if (!result.ok) throw new BadRequestException(result.message);
    return result;
  }

  // ─── Generic operation executor ───────────────────────────────────────────

  private async withProvider<T>(
    companyId: string,
    credentialsId: string,
    fn: (
      provider: ICalendarProvider,
      credentials: Record<string, any>,
    ) => Promise<CalendarOperationResult<T>>,
  ): Promise<T> {
    const resolved = await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: credentialsId,
    });
    const provider = this.calendarFactory.getCalendarProvider(
      resolved.providerKey,
    );
    const result = await fn(provider, resolved.credentials);
    if (!result.ok) throw new BadRequestException(result.message);
    return result.data;
  }

  // ─── Calendar management ─────────────────────────────────────────────────

  async listCalendars(companyId: string, credId: string): Promise<any> {
    return this.withProvider(companyId, credId, (p, c) => p.listCalendars(c));
  }

  async getCalendar(
    companyId: string,
    credId: string,
    calId: string,
  ): Promise<any> {
    return this.withProvider(companyId, credId, (p, c) =>
      p.getCalendar(c, calId),
    );
  }

  async createCalendar(
    companyId: string,
    credId: string,
    dto: CreateCalendarResourceDto,
  ): Promise<any> {
    return this.withProvider(companyId, credId, (p, c) =>
      p.createCalendar(c, {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        timeZone: dto.timeZone,
      }),
    );
  }

  async updateCalendar(
    companyId: string,
    credId: string,
    calId: string,
    dto: UpdateCalendarResourceDto,
  ): Promise<any> {
    return this.withProvider(companyId, credId, (p, c) =>
      p.updateCalendar(c, calId, {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        timeZone: dto.timeZone,
      }),
    );
  }

  async deleteCalendar(
    companyId: string,
    credId: string,
    calId: string,
  ): Promise<any> {
    return this.withProvider(companyId, credId, (p, c) =>
      p.deleteCalendar(c, calId),
    );
  }

  async subscribeCalendar(
    companyId: string,
    credId: string,
    dto: SubscribeCalendarDto,
  ): Promise<any> {
    const resolved = await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: credId,
    });
    const provider = this.calendarFactory.getCalendarProvider(
      resolved.providerKey,
    );

    if (!provider.subscribeCalendar) {
      throw new BadRequestException(
        'Automatic holiday subscription is not supported by this calendar provider.',
      );
    }

    const result = await provider.subscribeCalendar(resolved.credentials, {
      url: dto.url,
      name: dto.name,
    });

    if (!result.ok) {
      // 422 Unprocessable: the request was valid but the provider cannot fulfil it
      // (capability limitation, not a client error). Distinguishable from 400 Bad Request.
      throw new UnprocessableEntityException(
        result.message ??
          'Automatic holiday subscription is not supported by this calendar provider.',
      );
    }

    return result.data;
  }

  // ─── Event management ─────────────────────────────────────────────────────

  async listEvents(
    companyId: string,
    credId: string,
    calId: string,
    query: ListEventsQueryDto,
  ): Promise<any> {
    const result = await this.withProvider(companyId, credId, (p, c) =>
      p.listEvents(c, calId, {
        from: query.from,
        to: query.to,
        limit: query.limit,
        pageToken: query.pageToken,
      }),
    );

    // COMMUNICATIONS_OUTBOUND_EVENT — log the first few events being sent to Business App
    if ((result as any)?.items?.length > 0) {
      const sample = (result as any).items.slice(0, 3);
      for (const ev of sample) {
        process.stdout.write(
          `[COMM_SVC] COMMUNICATIONS_OUTBOUND_EVENT | id=${ev.id ?? 'undefined'} ` +
            `startAt=${ev.startAt ?? 'undefined'} endAt=${ev.endAt ?? 'undefined'} ` +
            `timeZone=${ev.timeZone ?? 'undefined'} allDay=${ev.allDay}\n`,
        );
      }
    }

    return result;
  }

  async getEvent(
    companyId: string,
    credId: string,
    calId: string,
    eventId: string,
  ): Promise<any> {
    return this.withProvider(companyId, credId, (p, c) =>
      p.getEvent(c, calId, eventId),
    );
  }

  async createEvent(
    companyId: string,
    credId: string,
    calId: string,
    dto: CreateEventDto,
  ): Promise<any> {
    return this.withProvider(companyId, credId, (p, c) =>
      p.createEvent(c, calId, {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startAt: dto.startAt,
        endAt: dto.endAt,
        allDay: dto.allDay,
        timeZone: dto.timeZone,
        attendees: dto.attendees,
      }),
    );
  }

  async updateEvent(
    companyId: string,
    credId: string,
    calId: string,
    eventId: string,
    dto: UpdateEventDto,
  ): Promise<any> {
    return this.withProvider(companyId, credId, (p, c) =>
      p.updateEvent(c, calId, eventId, {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startAt: dto.startAt,
        endAt: dto.endAt,
        allDay: dto.allDay,
        timeZone: dto.timeZone,
      }),
    );
  }

  async deleteEvent(
    companyId: string,
    credId: string,
    calId: string,
    eventId: string,
  ): Promise<any> {
    return this.withProvider(companyId, credId, (p, c) =>
      p.deleteEvent(c, calId, eventId),
    );
  }
}
