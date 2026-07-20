import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';

import { Shift, ShiftDocument } from './schemas/shift.schema';
import { Contract, ContractDocument } from '../contracts/schemas/contract.schema';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
import { BusinessIntelligenceService } from '../../integrations/business-intelligence/business-intelligence.service';
import { UsersService } from '../users/users.service';
import { LinkedCalendarsService } from '../linked-calendars/linked-calendars.service';
import { CommunicationsCalendarClient } from '../linked-calendars/clients/communications-calendar.client';

export interface ShiftListParams {
  page:              number;
  limit:             number;
  contractId?:       string;
  customerId?:       string;
  status?:           string;
  date?:             string;
  search?:           string;
  /** 'calendar' = createdFromCalendar=true; 'manual' = createdFromCalendar=false */
  source?:           string;
  linkedCalendarId?: string;
}

export interface ActorContext {
  email:     string;
  firstName: string;
  companyId: string;
}

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(
    @InjectModel(Shift.name)
    private readonly model: Model<ShiftDocument>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
    private readonly commClient: CommunicationsClientService,
    private readonly biService: BusinessIntelligenceService,
    private readonly usersService: UsersService,
    private readonly linkedCalendarsService: LinkedCalendarsService,
    private readonly calendarClient: CommunicationsCalendarClient,
  ) {}

  // ─── Tenant validation ────────────────────────────────────────────────────

  private async assertContractOwnership(
    contractId: string,
    businessId: string,
  ): Promise<ContractDocument> {
    if (!Types.ObjectId.isValid(contractId)) {
      throw new BadRequestException('Invalid contractId');
    }
    const contract = await this.contractModel
      .findOne({ _id: contractId, businessId })
      .lean()
      .exec();
    if (!contract) {
      throw new NotFoundException('Contract not found or does not belong to this business');
    }
    return contract as ContractDocument;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Create a Shift from Business App.
   *
   * Consistency strategy (Option B — local-first):
   *   1. Validate ownership of Contract and, if provided, Linked Calendar.
   *   2. Create local Shift with syncStatus='pending'.
   *   3. If linkedCalendarId supplied: create provider calendar event via Communications.
   *      On success: patch local Shift with external identity + syncStatus='synced'.
   *      On failure: patch local Shift with syncStatus='error'; throw to surface the failure.
   *   4. Fire notification after final Shift state is persisted.
   */
  async create(
    businessId: string,
    dto: CreateShiftDto,
    actor: ActorContext,
  ): Promise<ShiftDocument> {
    const contract = await this.assertContractOwnership(dto.contractId, businessId);

    // Resolve Linked Calendar metadata when caller specifies a target calendar
    let linkedCalendar: Awaited<ReturnType<LinkedCalendarsService['findAll']>>[0] | null = null;
    if (dto.linkedCalendarId) {
      const cals = await this.linkedCalendarsService.findAll(businessId, {
        status: 'active',
        flow:   'shifts',
      });
      linkedCalendar = cals.find((c) => c.id === dto.linkedCalendarId) ?? null;
      if (!linkedCalendar) {
        throw new NotFoundException(
          `Linked Calendar '${dto.linkedCalendarId}' not found, inactive, or not configured for Shift synchronization.`,
        );
      }
    }

    // Determine event title: use provided title, fall back to contract position name
    const eventTitle = dto.title?.trim() || (contract as any).positionName || 'Shift';

    // Step 1 — Create local Shift with pending sync status
    const doc = await this.model.create({
      businessId,
      contractId:       dto.contractId,
      customerId:       (contract as any).customerId,
      date:             dto.date,
      startTime:        dto.startTime,
      endTime:          dto.endTime,
      breakMinutes:     dto.breakMinutes ?? null,
      status:           dto.status ?? 'draft',
      location:         dto.location?.trim() ?? null,
      notes:            dto.notes?.trim() ?? null,
      title:            linkedCalendar ? eventTitle : null,
      createdFromCalendar: false,
      contractAssigned: true,
      syncStatus:       linkedCalendar ? 'pending' : null,
      linkedCalendarId: linkedCalendar?.id ?? null,
      calendarProvider: linkedCalendar?.providerKey ?? null,
      calendarAccount:  linkedCalendar?.accountIdentifier ?? null,
      calendarId:       linkedCalendar?.externalCalendarId ?? null,
      calendarName:     linkedCalendar?.calendarName ?? null,
    });

    // Step 2 — Push to external calendar if a Shift calendar was specified
    if (linkedCalendar) {
      try {
        // Compute the end date: if endTime is strictly before startTime the shift
        // crosses midnight — the end belongs to the following calendar day.
        const endDateStr = ShiftsService.computeEndDateStr(dto.date, dto.startTime, dto.endTime);

        const externalEvent = await this.calendarClient.createCalendarEvent(
          businessId,
          linkedCalendar.connectionId,
          linkedCalendar.externalCalendarId,
          {
            title:       eventTitle,
            startAt:     `${dto.date}T${dto.startTime}:00`,
            endAt:       `${endDateStr}T${dto.endTime}:00`,
            description: dto.notes ?? undefined,
            location:    dto.location ?? undefined,
            // Include the calendar's IANA timezone so Communications can produce
            // an offset-aware timestamp. Without this, the provider may treat the
            // naive local datetime as UTC, shifting the event by the tz offset.
            ...(linkedCalendar.timezone ? { timeZone: linkedCalendar.timezone } : {}),
          },
        );

        // Step 3 — Patch local Shift with provider identity
        const synced = await this.model
          .findOneAndUpdate(
            { _id: doc._id, businessId },
            {
              $set: {
                externalEventId:      externalEvent.uid ?? externalEvent.id,
                externalOccurrenceId: externalEvent.id,
                syncStatus:           'synced',
              },
            },
            { new: true },
          )
          .lean()
          .exec();

        this._notify('shifts.shift_created', synced ?? doc, contract, actor).catch(() => void 0);
        return (synced ?? doc) as ShiftDocument;
      } catch (err: any) {
        // External creation failed — mark Shift as error so the user knows it is unsynced
        await this.model
          .findOneAndUpdate({ _id: doc._id, businessId }, { $set: { syncStatus: 'error' } })
          .lean()
          .exec()
          .catch(() => void 0);

        this.logger.error(
          `[ShiftsService.create] External calendar event creation failed for shift ${doc._id}: ${err?.message}`,
        );
        // Surface the failure — do not pretend success
        throw err;
      }
    }

    this._notify('shifts.shift_created', doc, contract, actor).catch(() => void 0);
    return doc;
  }

  async findAll(
    businessId: string,
    params: ShiftListParams,
  ): Promise<{ items: ShiftDocument[]; total: number; page: number; limit: number }> {
    const { page, limit, contractId, customerId, status, date, search, source, linkedCalendarId } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { businessId };
    if (contractId)       filter.contractId       = contractId;
    if (customerId)       filter.customerId       = customerId;
    if (status)           filter.status           = status;
    if (date)             filter.date             = date;
    if (linkedCalendarId) filter.linkedCalendarId = linkedCalendarId;
    if (source === 'calendar') filter.createdFromCalendar = true;
    if (source === 'manual')   filter.createdFromCalendar = false;
    if (search?.trim()) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ location: re }, { notes: re }, { title: re }];
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ date: -1, startTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as any,
      this.model.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string, businessId: string): Promise<ShiftDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findOne({ _id: id, businessId }).lean().exec();
  }

  async findByIdOrThrow(id: string, businessId: string): Promise<ShiftDocument> {
    const doc = await this.findById(id, businessId);
    if (!doc) throw new NotFoundException('Shift not found');
    return doc;
  }

  async update(
    id: string,
    businessId: string,
    dto: UpdateShiftDto,
    actor: ActorContext,
  ): Promise<ShiftDocument> {
    const existing = await this.findByIdOrThrow(id, businessId);

    if ((existing as any).status === 'cancelled') {
      throw new BadRequestException('Cannot update a cancelled shift');
    }

    const $set: Record<string, any> = {};
    if (dto.title        !== undefined) $set.title        = dto.title?.trim() ?? null;
    if (dto.date         !== undefined) $set.date         = dto.date;
    if (dto.startTime    !== undefined) $set.startTime    = dto.startTime;
    if (dto.endTime      !== undefined) $set.endTime      = dto.endTime;
    if (dto.breakMinutes !== undefined) $set.breakMinutes = dto.breakMinutes;
    if (dto.location     !== undefined) $set.location     = dto.location?.trim() ?? null;
    if (dto.notes        !== undefined) $set.notes        = dto.notes?.trim() ?? null;

    const updated = await this.model
      .findOneAndUpdate({ _id: id, businessId }, { $set }, { new: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Shift not found');

    const contract = await this.contractModel.findById((existing as any).contractId).lean().exec();
    this._notify('shifts.shift_updated', updated, contract, actor).catch(() => void 0);

    // Push changes to external calendar when Shift is linked to a provider event
    const externalOccurrenceId = (existing as any).externalOccurrenceId as string | null;
    const linkedCalendarId     = (existing as any).linkedCalendarId as string | null;

    if (externalOccurrenceId && linkedCalendarId) {
      this._pushExternalUpdate(businessId, linkedCalendarId, externalOccurrenceId, updated as any).catch(
        (err: any) => this.logger.warn(
          `[ShiftsService.update] External calendar update failed for shift ${id}: ${err?.message}`,
        ),
      );
    }

    return updated;
  }

  /**
   * Advance the end date by one local calendar day when the shift crosses midnight
   * (endTime strictly before startTime). Otherwise return the same date.
   */
  static computeEndDateStr(date: string, startTime: string, endTime: string): string {
    if (endTime < startTime) {
      const [year, month, day] = date.split('-').map(Number);
      const next = new Date(Date.UTC(year, month - 1, day + 1));
      return next.toISOString().slice(0, 10);
    }
    return date;
  }

  private async _pushExternalUpdate(
    businessId: string,
    linkedCalendarId: string,
    eventId: string,
    shift: any,
  ): Promise<void> {
    const cals = await this.linkedCalendarsService.findAll(businessId, { status: 'active', flow: 'shifts' });
    const cal  = cals.find((c) => c.id === linkedCalendarId);
    if (!cal) {
      this.logger.warn(`[_pushExternalUpdate] LinkedCalendar ${linkedCalendarId} not found or inactive for business ${businessId}`);
      return;
    }

    const date      = shift.date      as string | null;
    const startTime = shift.startTime as string | null;
    const endTime   = shift.endTime   as string | null;

    const endDateStr = date && startTime && endTime
      ? ShiftsService.computeEndDateStr(date, startTime, endTime)
      : date;

    await this.calendarClient.updateCalendarEvent(
      businessId,
      cal.connectionId,
      cal.externalCalendarId,
      eventId,
      {
        ...(shift.title    ? { title:       shift.title    } : {}),
        ...(date && startTime ? { startAt: `${date}T${startTime}:00` } : {}),
        ...(date && endTime && endDateStr ? { endAt: `${endDateStr}T${endTime}:00` } : {}),
        ...(shift.location !== undefined ? { location: shift.location ?? undefined } : {}),
        ...(cal.timezone   ? { timeZone:   cal.timezone   } : {}),
      },
    );
  }

  // ─── Status transitions ───────────────────────────────────────────────────

  async confirm(id: string, businessId: string, actor: ActorContext): Promise<ShiftDocument> {
    const doc = await this.findByIdOrThrow(id, businessId);
    const current = (doc as any).status as string;

    if (current !== 'draft') {
      throw new BadRequestException(
        `Cannot confirm a shift with status "${current}". Only draft shifts can be confirmed.`,
      );
    }

    const updated = await this.model
      .findOneAndUpdate({ _id: id, businessId }, { $set: { status: 'confirmed' } }, { new: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Shift not found');

    const contract = await this.contractModel.findById((doc as any).contractId).lean().exec();
    this._notify('shifts.shift_confirmed', updated, contract, actor).catch(() => void 0);
    return updated;
  }

  async cancel(id: string, businessId: string, actor: ActorContext): Promise<ShiftDocument> {
    const doc = await this.findByIdOrThrow(id, businessId);
    const current = (doc as any).status as string;

    if (current === 'cancelled') {
      throw new BadRequestException('Shift is already cancelled');
    }

    const updated = await this.model
      .findOneAndUpdate({ _id: id, businessId }, { $set: { status: 'cancelled' } }, { new: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Shift not found');

    const contract = await this.contractModel.findById((doc as any).contractId).lean().exec();
    this._notify('shifts.shift_cancelled', updated, contract, actor).catch(() => void 0);
    return updated;
  }

  /**
   * Assign (or reassign) a Contract to a calendar-imported Shift.
   *
   * Rules:
   * - Shift must belong to the same Business (tenant isolation).
   * - Contract must belong to the same Business.
   * - customerId is resolved from the Contract — never trusted from the caller.
   * - Sets contractAssigned=true so BI pending-task queries can track resolution.
   * - Allowed on any Shift (manual or calendar) so a wrong manual contract can be corrected.
   * - Fires shift_updated notification fire-and-forget after persistence.
   */
  async assignContract(
    id: string,
    businessId: string,
    contractId: string,
    actor: ActorContext,
  ): Promise<ShiftDocument> {
    const doc      = await this.findByIdOrThrow(id, businessId);
    const contract = await this.assertContractOwnership(contractId, businessId);

    if ((doc as any).status === 'cancelled') {
      throw new BadRequestException('Cannot assign a contract to a cancelled shift');
    }

    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, businessId },
        {
          $set: {
            contractId:       contractId,
            customerId:       (contract as any).customerId ?? null,
            contractAssigned: true,
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Shift not found');

    this._notify('shifts.shift_updated', updated, contract, actor).catch(() => void 0);
    return updated;
  }

  /**
   * Atomically assign a Contract to multiple calendar-imported Shifts.
   *
   * Validation pass first (no transaction) — rejects the entire request if any
   * assignment fails validation.  On success, all writes execute inside a
   * MongoDB session transaction so the operation is all-or-nothing.
   * After commit, triggers an incremental BI ETL for the shift model so the
   * pending read-model becomes current.
   */
  async bulkAssignContracts(
    businessId: string,
    assignments: Array<{ shiftId: string; contractId: string }>,
    actor: ActorContext,
  ): Promise<{ success: true; total: number; updated: number; skipped: number; shiftIds: string[] }> {
    if (!assignments.length) {
      throw new BadRequestException('assignments must not be empty');
    }

    // Reject duplicate shiftId values in a single request
    const shiftIdSet = new Set(assignments.map((a) => a.shiftId));
    if (shiftIdSet.size !== assignments.length) {
      throw new BadRequestException('assignments contains duplicate shiftId values');
    }

    // ── Validation pass ───────────────────────────────────────────────────────
    // Collect all errors before rejecting so the client can fix everything at once.
    type ValidationError = { shiftId: string; code: string; message: string };
    const validationErrors: ValidationError[] = [];
    type ValidPair = { shiftId: string; contractId: string; customerId: string | null };
    const validPairs: ValidPair[] = [];

    // Assignments where the shiftId is not found in this business are silently
    // skipped — they correspond to orphaned BI records (fact_shift rows whose
    // source MongoDB shift was deleted).  Only real domain errors (wrong business
    // context, cancelled shift, invalid/inactive contract) fail the batch.
    const skippedOrphanedIds: string[] = [];

    for (const { shiftId, contractId } of assignments) {
      if (!Types.ObjectId.isValid(shiftId)) {
        validationErrors.push({ shiftId, code: 'SHIFT_INVALID_ID', message: 'Invalid Shift ID format' });
        continue;
      }
      if (!Types.ObjectId.isValid(contractId)) {
        validationErrors.push({ shiftId, code: 'CONTRACT_INVALID_ID', message: 'Invalid Contract ID format' });
        continue;
      }

      const shift = await this.model.findOne({ _id: shiftId, businessId }).lean().exec();
      if (!shift) {
        // Orphaned BI record — the MongoDB shift no longer exists.
        // Skip silently and log; a subsequent full BI sync will remove the stale row.
        this.logger.warn(
          `[bulkAssign] shiftId=${shiftId} not found in MongoDB — treating as orphaned BI record, skipping`,
        );
        skippedOrphanedIds.push(shiftId);
        continue;
      }
      if ((shift as any).status === 'cancelled') {
        validationErrors.push({ shiftId, code: 'SHIFT_CANCELLED', message: 'Cannot assign a Contract to a cancelled Shift' });
        continue;
      }

      const contract = await this.contractModel.findOne({ _id: contractId, businessId }).lean().exec();
      if (!contract) {
        validationErrors.push({ shiftId, code: 'CONTRACT_NOT_FOUND', message: 'Contract not found or belongs to another business' });
        continue;
      }
      if ((contract as any).status !== 'active') {
        validationErrors.push({ shiftId, code: 'CONTRACT_INACTIVE', message: 'The selected Contract is not active' });
        continue;
      }

      validPairs.push({ shiftId, contractId, customerId: (contract as any).customerId ?? null });
    }

    if (validationErrors.length > 0) {
      throw new BadRequestException({
        success:  false,
        message:  'One or more assignments are invalid',
        errors:   validationErrors,
      });
    }

    // All submitted assignments were orphaned — nothing to write.
    // Trigger a full BI sync to clean up the stale records.
    if (validPairs.length === 0) {
      this.logger.warn(
        `[bulkAssign] businessId=${businessId} all ${skippedOrphanedIds.length} assignments were orphaned BI records — triggering full BI cleanup`,
      );
      this.biService.syncModel(businessId, 'shift', true)
        .then((r) => this.logger.log(`[bulkAssign] full BI cleanup done inserted=${r?.inserted ?? 0} updated=${r?.updated ?? 0}`))
        .catch((err: any) => this.logger.warn(`[bulkAssign] full BI cleanup failed: ${err?.message ?? 'unknown'}`));
      return { success: true, total: 0, updated: 0, skipped: skippedOrphanedIds.length, shiftIds: [] };
    }

    // ── Transactional write ───────────────────────────────────────────────────
    let session: ClientSession | null = null;
    try {
      session = await (this.model as any).db.startSession() as ClientSession;
      session.startTransaction();

      for (const { shiftId, contractId, customerId } of validPairs) {
        await this.model.findOneAndUpdate(
          { _id: shiftId, businessId },
          { $set: { contractId, customerId, contractAssigned: true } },
          { session: session as any, new: true },
        ).lean().exec();
      }

      await session.commitTransaction();
    } catch (err) {
      if (session) await session.abortTransaction();
      throw err;
    } finally {
      if (session) await session.endSession();
    }

    // ── Post-commit: full BI ETL fire-and-forget ─────────────────────────────
    // Use full=true so BI runs the orphan-cleanup step and removes stale
    // fact_shift rows alongside updating the freshly-assigned shifts.
    this.biService.syncModel(businessId, 'shift', true)
      .then((r) =>
        this.logger.log(
          `[bulkAssign] full BI sync done businessId=${businessId} inserted=${r?.inserted ?? 0} updated=${r?.updated ?? 0}`,
        ),
      )
      .catch((err: any) =>
        this.logger.warn(`[bulkAssign] full BI sync failed businessId=${businessId}: ${err?.message ?? 'unknown'}`),
      );

    const updatedIds = validPairs.map((p) => p.shiftId);

    this.logger.log(
      `[bulkAssign] businessId=${businessId} updated=${updatedIds.length} skipped_orphaned=${skippedOrphanedIds.length} actor=${actor.email}`,
    );

    return {
      success: true,
      total:   updatedIds.length + skippedOrphanedIds.length,
      updated: updatedIds.length,
      skipped: skippedOrphanedIds.length,
      shiftIds: updatedIds,
    };
  }

  /**
   * Delete a Shift.
   *
   * Business rule: only draft shifts can be deleted.
   *
   * When the Shift is linked to an external calendar event:
   *   1. Delete the external event through Communications (404 = idempotent success).
   *   2. Only on external success (or 404) remove the local Shift.
   *   3. On other external failure: throw — local Shift is preserved, nothing lost.
   *
   * The Linked Calendar document is never deleted.
   */
  async remove(id: string, businessId: string, actor: ActorContext): Promise<void> {
    const doc = await this.findByIdOrThrow(id, businessId);

    if ((doc as any).status !== 'draft') {
      throw new BadRequestException(
        'Only draft shifts can be deleted. Cancel confirmed shifts instead.',
      );
    }

    // Delete external calendar event before removing the local record
    const externalOccurrenceId = (doc as any).externalOccurrenceId as string | null;
    const linkedCalendarId     = (doc as any).linkedCalendarId as string | null;

    if (externalOccurrenceId && linkedCalendarId) {
      const cals = await this.linkedCalendarsService.findAll(businessId, { status: 'active', flow: 'shifts' });
      const cal  = cals.find((c) => c.id === linkedCalendarId);

      if (cal) {
        // May throw on non-404 errors — local Shift is preserved in that case
        await this.calendarClient.deleteCalendarEvent(
          businessId,
          cal.connectionId,
          cal.externalCalendarId,
          externalOccurrenceId,
        );
        this.logger.log(
          `[ShiftsService.remove] Deleted external event ${externalOccurrenceId} from calendar ${linkedCalendarId}`,
        );
      } else {
        // Calendar no longer active/linked — log and proceed with local deletion
        this.logger.warn(
          `[ShiftsService.remove] LinkedCalendar ${linkedCalendarId} not active for business ${businessId}; skipping external delete`,
        );
      }
    }

    const contract = await this.contractModel.findById((doc as any).contractId).lean().exec();
    await this.model.findOneAndDelete({ _id: id, businessId }).exec();
    this._notify('shifts.shift_deleted', doc, contract, actor).catch(() => void 0);
  }

  // ─── Notifications (fire-and-forget) ─────────────────────────────────────

  private async _notify(
    eventKey: string,
    shift: any,
    contract: any,
    actor: ActorContext,
  ): Promise<void> {
    try {
      const businessName = await this.usersService
        .getCompanyDisplayName(actor.companyId)
        .catch(() => '');

      const delivered = await this.commClient.notifyEvent({
        type:     'business',
        businessId: actor.companyId,
        event:    eventKey,
        email:    actor.email,
        data: {
          firstName:    actor.firstName,
          businessName,
          contractName: contract?.positionName ?? '',
          shiftDate:    shift.date,
          startTime:    shift.startTime,
          endTime:      shift.endTime,
          shiftStatus:  shift.status,
          actionDate:   new Date().toISOString(),
          ...(shift.location ? { location: shift.location } : {}),
          ...(shift.notes    ? { notes:    shift.notes    } : {}),
        },
      });

      this.logger.log(
        `[Shift notification] ${eventKey} → ${actor.email} delivered=${delivered}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[Shift notification] ${eventKey} failed: ${err?.message}`,
      );
    }
  }
}
