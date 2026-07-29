import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Shift, ShiftDocument } from '../../schemas/shift.schema';
import { SyncHistory, SyncHistoryDocument } from '../schemas/sync-history.schema';
import { LinkedCalendarsService } from '../../../linked-calendars/linked-calendars.service';
import { CommunicationsCalendarClient } from '../../../linked-calendars/clients/communications-calendar.client';
import { CommunicationsClientService } from '../../../../integrations/communications/client/communications-client.service';
import { UsersService } from '../../../users/users.service';
import { BusinessIntelligenceService } from '../../../../integrations/business-intelligence/business-intelligence.service';
import { CalendarEventToShiftMapper } from '../mappers/calendar-event-to-shift.mapper';
import type { BusinessSyncResult, CalendarSyncStats } from '../interfaces/sync-result.interface';
import type { LinkedCalendarQueryDto } from '../../../linked-calendars/dto/linked-calendar-query.dto';
import type { LinkedCalendarResponseDto } from '../../../linked-calendars/dto/linked-calendar-response.dto';

/**
 * ShiftSyncService
 *
 * Responsible for:
 *   1. Reading all active linked calendars for a Business.
 *   2. Fetching events from Communications for each calendar.
 *   3. Upserting Shift records (idempotent by externalOccurrenceId).
 *   4. Marking shifts whose events have disappeared as syncStatus=deleted.
 *   5. Recording sync history.
 *   6. Sending Platform email notifications for important sync events.
 *
 * Designed for reuse from both the manual-sync endpoint and a future cron scheduler.
 * The sync logic must NEVER live in the controller.
 */
@Injectable()
export class ShiftSyncService {
  private readonly logger = new Logger(ShiftSyncService.name);

  /** Default sync window: 30 days back to 180 days ahead. */
  private static readonly DAYS_BACK    = 30;
  private static readonly DAYS_FORWARD = 180;

  constructor(
    @InjectModel(Shift.name)
    private readonly shiftModel: Model<ShiftDocument>,
    @InjectModel(SyncHistory.name)
    private readonly historyModel: Model<SyncHistoryDocument>,
    private readonly linkedCalendarsService: LinkedCalendarsService,
    private readonly calendarClient: CommunicationsCalendarClient,
    private readonly commClient: CommunicationsClientService,
    private readonly usersService: UsersService,
    private readonly biService: BusinessIntelligenceService,
  ) {}

  // ─── Public entry point ───────────────────────────────────────────────────

  /**
   * Synchronize all active linked calendars for the given Business.
   * Safe to call from a controller or a scheduled job.
   *
   * @param actor  Used for email notifications only — never for authorization.
   */
  async syncBusiness(
    businessId: string,
    actor: { userId: string; email: string; firstName: string },
  ): Promise<BusinessSyncResult> {
    const wall     = Date.now();
    const startedAt = new Date().toISOString();

    this.logger.log(`[sync] START businessId=${businessId}`);

    const query: LinkedCalendarQueryDto = { status: 'active', flow: 'shifts' };
    const calendars = await this.linkedCalendarsService.findAll(businessId, query);

    this.logger.log(`[sync] ${calendars.length} active shift-flow calendars`);

    const stats: CalendarSyncStats[] = [];

    for (const calendar of calendars) {
      const calStat = await this.syncCalendar(businessId, calendar);
      stats.push(calStat);
    }

    const totalCreated   = stats.reduce((n, s) => n + s.created,   0);
    const totalUpdated   = stats.reduce((n, s) => n + s.updated,   0);
    const totalDeleted   = stats.reduce((n, s) => n + s.deleted,   0);
    const totalErrors    = stats.reduce((n, s) => n + s.errors.length, 0);
    const totalDurationMs = Date.now() - wall;
    const finishedAt     = new Date().toISOString();

    this.logger.log(
      `[sync] DONE businessId=${businessId} ` +
      `created=${totalCreated} updated=${totalUpdated} deleted=${totalDeleted} ` +
      `errors=${totalErrors} duration=${totalDurationMs}ms`,
    );

    // ── Email notification ──────────────────────────────────────────────────
    // TODO(shifts-notifications): notifyEvent() intentionally disabled.
    // Shift notification strategy is still under definition.
    // When re-enabled it MUST use type: 'platform' — do not restore with type: 'business'.
    // this.sendSyncNotification(businessId, actor, stats, totalCreated, totalUpdated, totalDeleted, totalErrors);

    // ── BI ETL trigger (fire-and-forget) ───────────────────────────────────
    // After calendar sync updates MongoDB, replicate fact_shift to PostgreSQL so
    // the pending-assignment summary reflects the current operational state.
    // Runs in the background — never blocks the sync response.
    this.biService.syncModel(businessId, 'shift', false)
      .then((r) =>
        this.logger.log(
          `[sync] BI ETL complete businessId=${businessId} inserted=${r?.inserted ?? 0} updated=${r?.updated ?? 0}`,
        ),
      )
      .catch((err: any) =>
        this.logger.warn(
          `[sync] BI ETL failed businessId=${businessId}: ${err?.message ?? 'unknown error'}`,
        ),
      );

    return {
      businessId,
      calendars: stats,
      totalCreated,
      totalUpdated,
      totalDeleted,
      totalErrors,
      totalDurationMs,
      startedAt,
      finishedAt,
    };
  }

  // ─── Single-calendar sync (public entry point) ───────────────────────────

  /**
   * Synchronize one active linked Shift calendar.
   * Validates ownership, active status, and shifts flow before delegating.
   * Called from POST /shifts/sync/:linkedCalendarId.
   */
  async syncSingleCalendar(
    businessId: string,
    linkedCalendarId: string,
    actor: { userId: string; email: string; firstName: string },
  ): Promise<CalendarSyncStats> {
    const calendar = await this.linkedCalendarsService.findById(linkedCalendarId, businessId);

    if (calendar.status !== 'active') {
      throw new BadRequestException(`Calendar '${calendar.calendarName}' is not active`);
    }
    if (calendar.flow !== 'shifts') {
      throw new BadRequestException(
        `Calendar '${calendar.calendarName}' is not configured for shift synchronisation`,
      );
    }

    this.logger.log(
      `[sync:single] START linkedCalendarId=${linkedCalendarId} businessId=${businessId}`,
    );

    const result = await this.syncCalendar(businessId, calendar);

    this.logger.log(
      `[sync:single] DONE linkedCalendarId=${linkedCalendarId} ` +
      `created=${result.created} updated=${result.updated} errors=${result.errors.length}`,
    );

    this.biService.syncModel(businessId, 'shift', false)
      .then((r) =>
        this.logger.log(
          `[sync:single] BI ETL done businessId=${businessId} inserted=${r?.inserted ?? 0} updated=${r?.updated ?? 0}`,
        ),
      )
      .catch((err: any) =>
        this.logger.warn(
          `[sync:single] BI ETL failed businessId=${businessId}: ${err?.message ?? 'unknown'}`,
        ),
      );

    return result;
  }

  // ─── Per-calendar sync ────────────────────────────────────────────────────

  private async syncCalendar(
    businessId: string,
    calendar: LinkedCalendarResponseDto,
  ): Promise<CalendarSyncStats> {
    const calWall   = Date.now();
    const startedAt = new Date();

    const history = await this.historyModel.create({
      businessId,
      linkedCalendarId:  calendar.id,
      calendarName:      calendar.calendarName,
      accountIdentifier: calendar.accountIdentifier,
      providerKey:       calendar.providerKey,
      startedAt,
      status:            'running',
    });

    const errors: string[] = [];
    let eventsReceived = 0;
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let skipped = 0;

    try {
      // ── 1. Calculate date range ─────────────────────────────────────────
      const now  = new Date();
      const from = new Date(now);
      const to   = new Date(now);
      from.setDate(from.getDate() - ShiftSyncService.DAYS_BACK);
      to.setDate(to.getDate() + ShiftSyncService.DAYS_FORWARD);

      // ── 2. Fetch events from Communications ────────────────────────────
      let events: import('../../../linked-calendars/clients/communications-calendar.client').CommCalendarEventInfo[] = [];
      try {
        events = await this.calendarClient.listCalendarEvents(
          businessId,
          calendar.connectionId,
          calendar.externalCalendarId,
          { from: from.toISOString(), to: to.toISOString() },
        );
        eventsReceived = events.length;
        this.logger.log(
          `[sync:${calendar.calendarName}] ${eventsReceived} events from Communications`,
        );
      } catch (err: any) {
        const msg = `Failed to fetch events: ${err?.message ?? 'Unknown error'}`;
        errors.push(msg);
        this.logger.error(`[sync:${calendar.calendarName}] ${msg}`);
        // Record failure and return early for this calendar
        const durationMs = Date.now() - calWall;
        await this.historyModel.findOneAndUpdate(
          { _id: history._id },
          { $set: { finishedAt: new Date(), status: 'failed', errors, durationMs } },
        );
        return {
          linkedCalendarId:  calendar.id,
          calendarName:      calendar.calendarName,
          accountIdentifier: calendar.accountIdentifier,
          eventsReceived: 0,
          created: 0, updated: 0, deleted: 0, skipped: 0,
          errors,
          durationMs,
          status: 'failed',
        };
      }

      // ── 3. Upsert each event as a Shift ────────────────────────────────
      const seenOccurrenceIds = new Set<string>();

      for (const event of events) {
        if (!event.id) { skipped++; continue; }

        seenOccurrenceIds.add(event.id);

        const normalized = CalendarEventToShiftMapper.map(event, calendar);
        if (!normalized) { skipped++; continue; }

        // BUSINESS_APP_SHIFT_BEFORE_SAVE — log exactly what will be persisted
        process.stdout.write(
          `[SHIFT_SYNC] BUSINESS_APP_SHIFT_BEFORE_SAVE | occurrenceId=${event.id} ` +
          `date=${normalized.date} startTime=${normalized.startTime} ` +
          `endDate=${normalized.endDate} endTime=${normalized.endTime} ` +
          `timezone=${normalized.timezone ?? 'null'} allDay=${normalized.allDay} ` +
          `startInstant=${normalized.start.toISOString()} endInstant=${normalized.end.toISOString()}\n`,
        );

        try {
          const filter = {
            businessId,
            externalOccurrenceId: event.id,
          };

          const existingShift = await this.shiftModel
            .findOne(filter)
            .select('_id')
            .lean()
            .exec();

          if (existingShift) {
            // Update — overwrite calendar fields, preserve business fields
            await this.shiftModel.findOneAndUpdate(
              filter,
              {
                $set: {
                  title:              normalized.title,
                  description:        normalized.description,
                  location:           normalized.location,
                  start:              normalized.start,
                  end:                normalized.end,
                  date:               normalized.date,
                  startTime:          normalized.startTime,
                  endDate:            normalized.endDate,
                  endTime:            normalized.endTime,
                  allDay:             normalized.allDay,
                  timezone:           normalized.timezone,
                  organizer:          normalized.organizer,
                  attendees:          normalized.attendees,
                  lastExternalUpdate: normalized.lastExternalUpdate,
                  syncStatus:         'synced',
                  metadata:           normalized.metadata,
                },
              },
            ).exec();
            updated++;
          } else {
            // Create new shift from calendar event
            await this.shiftModel.create({
              businessId,
              ...normalized,
            });
            created++;
          }
        } catch (err: any) {
          const msg = `Upsert failed for event ${event.id}: ${err?.message}`;
          errors.push(msg);
          this.logger.warn(`[sync:${calendar.calendarName}] ${msg}`);
          skipped++;
        }
      }

      // ── 4. Mark disappeared events as deleted ──────────────────────────
      if (seenOccurrenceIds.size > 0 || eventsReceived === 0) {
        const deletedResult = await this.shiftModel.updateMany(
          {
            businessId,
            linkedCalendarId: calendar.id,
            syncStatus: { $in: ['synced', 'pending'] },
            externalOccurrenceId: {
              $nin: [...seenOccurrenceIds],
            },
          },
          { $set: { syncStatus: 'deleted' } },
        ).exec();
        deleted = deletedResult.modifiedCount ?? 0;
        if (deleted > 0) {
          this.logger.log(`[sync:${calendar.calendarName}] marked ${deleted} shifts as deleted`);
        }
      }

    } catch (err: any) {
      const msg = `Unexpected sync error: ${err?.message}`;
      errors.push(msg);
      this.logger.error(`[sync:${calendar.calendarName}] ${msg}`, err?.stack);
    }

    const durationMs  = Date.now() - calWall;
    const syncStatus: 'completed' | 'failed' = errors.length > 0 && created + updated === 0 ? 'failed' : 'completed';

    // ── 5. Update sync history ──────────────────────────────────────────
    await this.historyModel.findOneAndUpdate(
      { _id: history._id },
      {
        $set: {
          finishedAt:     new Date(),
          eventsReceived,
          created,
          updated,
          deleted,
          skipped,
          errors,
          durationMs,
          status: syncStatus,
        },
      },
    ).exec();

    return {
      linkedCalendarId:  calendar.id,
      calendarName:      calendar.calendarName,
      accountIdentifier: calendar.accountIdentifier,
      eventsReceived,
      created,
      updated,
      deleted,
      skipped,
      errors,
      durationMs,
      status: syncStatus,
    };
  }

  // ─── Sync history ────────────────────────────────────────────────────────

  async getSyncHistory(
    businessId: string,
    params: { page: number; limit: number; linkedCalendarId?: string },
  ) {
    const skip = (params.page - 1) * params.limit;
    const filter: Record<string, any> = { businessId };
    if (params.linkedCalendarId) filter.linkedCalendarId = params.linkedCalendarId;

    const [items, total] = await Promise.all([
      this.historyModel
        .find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .lean()
        .exec(),
      this.historyModel.countDocuments(filter),
    ]);

    return { items, total, page: params.page, limit: params.limit };
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  // TODO(shifts-notifications): notifyEvent() intentionally disabled.
  // Calendar sync notification strategy is still under definition.
  // Final implementation MUST use Platform credentials:
  //   type: 'platform'   ← required
  //   businessId must NOT be passed when type is 'platform'
  // Do NOT restore using type: 'business'.
  // Re-enable once the notification behavior and delivery channels have been approved.
  private sendSyncNotification(
    businessId: string,
    actor: { userId: string; email: string; firstName: string },
    stats: CalendarSyncStats[],
    totalCreated: number,
    totalUpdated: number,
    totalDeleted: number,
    totalErrors: number,
  ): void {
    void businessId; void actor; void stats; void totalCreated; void totalUpdated; void totalDeleted; void totalErrors;
    // const hasFailures = stats.some((s) => s.status === 'failed');
    // const event = hasFailures
    //   ? 'calendar_sync.sync_failed'
    //   : 'calendar_sync.sync_completed';
    //
    // const calendarNames = stats.map((s) => s.calendarName).join(', ');
    //
    // this.usersService
    //   .getCompanyDisplayName(businessId)
    //   .catch(() => businessId)
    //   .then((businessName) =>
    //     this.commClient.notifyEvent({
    //       type:  'platform',  // ← MUST be 'platform' — do NOT use 'business'
    //       event,
    //       email:      actor.email,
    //       data: {
    //         firstName:     actor.firstName,
    //         businessName,
    //         calendarNames,
    //         totalCreated:  String(totalCreated),
    //         totalUpdated:  String(totalUpdated),
    //         totalDeleted:  String(totalDeleted),
    //         totalErrors:   String(totalErrors),
    //         actionDate:    new Date().toISOString(),
    //       },
    //     }),
    //   )
    //   .then((ok) => this.logger.log(`[sync:notify] ${event} delivered=${ok}`))
    //   .catch((err: any) =>
    //     this.logger.error(`[sync:notify] ${event} failed: ${err?.message}`),
    //   );
  }
}
