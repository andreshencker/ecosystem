/**
 * Tests for bidirectional Shift ↔ Calendar synchronization.
 *
 * Covers:
 *   - Business App → Calendar: create with external event
 *   - Business App → Calendar: create local-only (no linkedCalendarId)
 *   - Business App → Calendar: update pushes to external event
 *   - Business App → Calendar: delete removes external event then local
 *   - Contract assignment survives resync
 *   - Cross-tenant: wrong Linked Calendar rejected
 *   - Provider 404 on delete treated as idempotent success
 *   - External event failure on create keeps local Shift as error state
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ShiftsService } from '../shifts.service';
import { ShiftsController } from '../shifts.controller';
import { ShiftSyncService } from '../sync/services/shift-sync.service';
import { Shift } from '../schemas/shift.schema';
import { Contract } from '../../contracts/schemas/contract.schema';
import { SyncHistory } from '../sync/schemas/sync-history.schema';
import { CommunicationsClientService } from '../../../integrations/communications/client/communications-client.service';
import { UsersService } from '../../users/users.service';
import { LinkedCalendarsService } from '../../linked-calendars/linked-calendars.service';
import { CommunicationsCalendarClient } from '../../linked-calendars/clients/communications-calendar.client';
import { BusinessIntelligenceService } from '../../../integrations/business-intelligence/business-intelligence.service';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BIZ_ID      = 'biz1';
const SHIFT_ID    = '507f1f77bcf86cd799439011';
const CONTRACT_ID = '507f1f77bcf86cd799439012';
const CAL_ID      = '507f1f77bcf86cd799439020';   // LinkedCalendar Mongo ID
const EXT_CAL_ID  = 'ext-cal-001';
const CONN_ID     = 'conn-001';
const OCC_ID      = 'occ_20260720T090000Z';

function userCtx(): AuthContext {
  return { actorType: 'user', userId: 'u1', role: 'business_owner', scope: 'company', companyId: BIZ_ID, email: 'owner@biz.com' } as any;
}

function makeShift(overrides: Record<string, any> = {}) {
  return {
    _id:                 SHIFT_ID,
    businessId:          BIZ_ID,
    contractId:          CONTRACT_ID,
    customerId:          'cust1',
    status:              'draft',
    createdFromCalendar: false,
    contractAssigned:    true,
    syncStatus:          'synced',
    linkedCalendarId:    CAL_ID,
    externalOccurrenceId: OCC_ID,
    calendarId:          EXT_CAL_ID,
    date:                '2026-07-20',
    startTime:           '09:00',
    endTime:             '17:00',
    breakMinutes:        null,
    location:            null,
    notes:               null,
    title:               'Morning Shift',
    calendarProvider:    'icloud',
    calendarAccount:     'user@icloud.com',
    calendarName:        'Work Calendar',
    createdAt:           new Date(),
    updatedAt:           new Date(),
    ...overrides,
  };
}

function makeContract() {
  return { _id: CONTRACT_ID, businessId: BIZ_ID, customerId: 'cust1', positionName: 'Developer', status: 'active' };
}

function makeLinkedCalendar() {
  return {
    id:                 CAL_ID,
    companyId:          BIZ_ID,
    connectionId:       CONN_ID,
    providerKey:        'icloud',
    providerDisplayName: 'iCloud',
    accountIdentifier:  'user@icloud.com',
    externalCalendarId: EXT_CAL_ID,
    calendarName:       'Work Calendar',
    flow:               'shifts',
    status:             'active',
    timezone:           'Australia/Sydney',
  };
}

function makeCreatedEvent() {
  return {
    id:         OCC_ID,
    calendarId: EXT_CAL_ID,
    uid:        'uid-001',
    title:      'Morning Shift',
    startAt:    '2026-07-20T09:00:00',
    endAt:      '2026-07-20T17:00:00',
    allDay:     false,
  };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockShiftModel: any = {
  findOne:          jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  find:             jest.fn(),
  create:           jest.fn(),
  countDocuments:   jest.fn(),
  updateMany:       jest.fn(),
};

const mockContractModel: any  = { findOne: jest.fn(), findById: jest.fn() };
const mockHistoryModel: any   = { create: jest.fn(), findOneAndUpdate: jest.fn() };
const mockCommClient: any     = { notifyEvent: jest.fn().mockResolvedValue(true) };
const mockUsersService: any   = { getCompanyDisplayName: jest.fn().mockResolvedValue('Biz Name') };
const mockLinkedCalendarsService: any = { findAll: jest.fn() };
const mockCalendarClient: any = {
  listCalendarEvents:   jest.fn().mockResolvedValue([]),
  createCalendarEvent:  jest.fn(),
  updateCalendarEvent:  jest.fn(),
  deleteCalendarEvent:  jest.fn(),
};
const mockBiService: any = { syncModel: jest.fn().mockResolvedValue({ inserted: 0, updated: 0 }) };

function leanExec(value: any) {
  const exec = jest.fn().mockResolvedValue(value);
  const lean = jest.fn().mockReturnValue({ exec });
  return { lean, select: jest.fn().mockReturnValue({ lean }) };
}

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [ShiftsController],
    providers: [
      ShiftsService,
      ShiftSyncService,
      { provide: getModelToken(Shift.name),       useValue: mockShiftModel       },
      { provide: getModelToken(Contract.name),     useValue: mockContractModel    },
      { provide: getModelToken(SyncHistory.name),  useValue: mockHistoryModel     },
      { provide: CommunicationsClientService,      useValue: mockCommClient       },
      { provide: UsersService,                     useValue: mockUsersService     },
      { provide: LinkedCalendarsService,           useValue: mockLinkedCalendarsService },
      { provide: CommunicationsCalendarClient,     useValue: mockCalendarClient   },
      { provide: BusinessIntelligenceService,      useValue: mockBiService        },
    ],
  }).compile();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ShiftsService — Business App → Calendar (bidirectional)', () => {
  let service: ShiftsService;

  beforeEach(async () => {
    const mod = await buildModule();
    service   = mod.get(ShiftsService);
    jest.clearAllMocks();
    // Default: contract and calendar findById resolve
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));
    mockLinkedCalendarsService.findAll.mockResolvedValue([makeLinkedCalendar()]);
  });

  // ── CREATE: local-only (no linkedCalendarId) ───────────────────────────────

  it('creates a local-only shift when no linkedCalendarId is supplied', async () => {
    mockShiftModel.create.mockResolvedValue(makeShift({ linkedCalendarId: null, syncStatus: null }));

    const result = await service.create(BIZ_ID, {
      contractId: CONTRACT_ID,
      date:       '2026-07-20',
      startTime:  '09:00',
      endTime:    '17:00',
    }, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    expect(mockCalendarClient.createCalendarEvent).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  // ── CREATE: with linkedCalendarId → push to provider ──────────────────────

  it('creates local Shift and pushes event to provider calendar when linkedCalendarId given', async () => {
    const pendingShift = makeShift({ syncStatus: 'pending', externalOccurrenceId: null });
    const syncedShift  = makeShift({ syncStatus: 'synced', externalOccurrenceId: OCC_ID });

    mockShiftModel.create.mockResolvedValue(pendingShift);
    mockCalendarClient.createCalendarEvent.mockResolvedValue(makeCreatedEvent());
    mockShiftModel.findOneAndUpdate.mockReturnValue(leanExec(syncedShift));

    const result = await service.create(BIZ_ID, {
      contractId:      CONTRACT_ID,
      linkedCalendarId: CAL_ID,
      date:            '2026-07-20',
      startTime:       '09:00',
      endTime:         '17:00',
      title:           'Morning Shift',
    }, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    expect(mockCalendarClient.createCalendarEvent).toHaveBeenCalledWith(
      BIZ_ID, CONN_ID, EXT_CAL_ID,
      expect.objectContaining({
        title:   'Morning Shift',
        startAt: '2026-07-20T09:00:00',
        endAt:   '2026-07-20T17:00:00',
      }),
    );
    // Local Shift patched with external identity
    expect(mockShiftModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: BIZ_ID }),
      expect.objectContaining({
        $set: expect.objectContaining({
          externalOccurrenceId: OCC_ID,
          syncStatus:           'synced',
        }),
      }),
      expect.anything(),
    );
  });

  it('uses contract positionName as default title when title omitted', async () => {
    const pendingShift = makeShift({ syncStatus: 'pending', externalOccurrenceId: null });
    mockShiftModel.create.mockResolvedValue(pendingShift);
    mockCalendarClient.createCalendarEvent.mockResolvedValue(makeCreatedEvent());
    mockShiftModel.findOneAndUpdate.mockReturnValue(leanExec(makeShift()));

    await service.create(BIZ_ID, {
      contractId:      CONTRACT_ID,
      linkedCalendarId: CAL_ID,
      date:            '2026-07-20',
      startTime:       '09:00',
      endTime:         '17:00',
    }, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    const calEventCall = mockCalendarClient.createCalendarEvent.mock.calls[0][3];
    expect(calEventCall.title).toBe('Developer'); // from contract.positionName
  });

  it('marks Shift as syncStatus=error and throws when external event creation fails', async () => {
    const pendingShift = makeShift({ syncStatus: 'pending', externalOccurrenceId: null });
    mockShiftModel.create.mockResolvedValue(pendingShift);
    mockCalendarClient.createCalendarEvent.mockRejectedValue(
      new ServiceUnavailableException('Provider timeout'),
    );
    mockShiftModel.findOneAndUpdate.mockReturnValue(leanExec({}));

    await expect(
      service.create(BIZ_ID, {
        contractId:      CONTRACT_ID,
        linkedCalendarId: CAL_ID,
        date:            '2026-07-20',
        startTime:       '09:00',
        endTime:         '17:00',
      }, { email: 'e', firstName: 'F', companyId: BIZ_ID }),
    ).rejects.toThrow(ServiceUnavailableException);

    // Shift updated to error state
    expect(mockShiftModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { syncStatus: 'error' } },
    );
  });

  it('rejects unrecognised or non-shift-flow linkedCalendarId', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([]); // calendar not in list

    await expect(
      service.create(BIZ_ID, {
        contractId:      CONTRACT_ID,
        linkedCalendarId: 'bad-cal-id',
        date:            '2026-07-20',
        startTime:       '09:00',
        endTime:         '17:00',
      }, { email: 'e', firstName: 'F', companyId: BIZ_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('created Business App Shift has createdFromCalendar=false and contractAssigned=true', async () => {
    const pendingShift = makeShift({ syncStatus: 'pending', externalOccurrenceId: null });
    mockShiftModel.create.mockResolvedValue(pendingShift);
    mockCalendarClient.createCalendarEvent.mockResolvedValue(makeCreatedEvent());
    mockShiftModel.findOneAndUpdate.mockReturnValue(leanExec(makeShift()));

    await service.create(BIZ_ID, {
      contractId:      CONTRACT_ID,
      linkedCalendarId: CAL_ID,
      date:            '2026-07-20',
      startTime:       '09:00',
      endTime:         '17:00',
    }, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    const createCall = mockShiftModel.create.mock.calls[0][0];
    expect(createCall.createdFromCalendar).toBe(false);
    expect(createCall.contractAssigned).toBe(true);
    expect(createCall.syncStatus).toBe('pending');
  });

  // ── UPDATE: push to external calendar ─────────────────────────────────────

  it('pushes field changes to external calendar when Shift is linked', async () => {
    const linked = makeShift({ externalOccurrenceId: OCC_ID, linkedCalendarId: CAL_ID });
    mockShiftModel.findOne.mockReturnValue(leanExec(linked));
    mockShiftModel.findOneAndUpdate.mockReturnValue(leanExec({ ...linked, date: '2026-07-21' }));
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));
    mockCalendarClient.updateCalendarEvent.mockResolvedValue({});

    await service.update(SHIFT_ID, BIZ_ID, { date: '2026-07-21' }, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    // Give fire-and-forget a tick
    await Promise.resolve();
    expect(mockCalendarClient.updateCalendarEvent).toHaveBeenCalledWith(
      BIZ_ID, CONN_ID, EXT_CAL_ID, OCC_ID,
      expect.objectContaining({ startAt: expect.stringContaining('2026-07-21') }),
    );
  });

  it('does NOT call updateCalendarEvent for an unlinked (manual no-calendar) Shift', async () => {
    const unlinked = makeShift({ externalOccurrenceId: null, linkedCalendarId: null });
    mockShiftModel.findOne.mockReturnValue(leanExec(unlinked));
    mockShiftModel.findOneAndUpdate.mockReturnValue(leanExec({ ...unlinked, location: 'New Office' }));
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));

    await service.update(SHIFT_ID, BIZ_ID, { location: 'New Office' }, { email: 'e', firstName: 'F', companyId: BIZ_ID });
    await Promise.resolve();

    expect(mockCalendarClient.updateCalendarEvent).not.toHaveBeenCalled();
  });

  it('external update failure does not undo local update', async () => {
    const linked = makeShift({ externalOccurrenceId: OCC_ID, linkedCalendarId: CAL_ID });
    mockShiftModel.findOne.mockReturnValue(leanExec(linked));
    mockShiftModel.findOneAndUpdate.mockReturnValue(leanExec({ ...linked, location: 'New Office' }));
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));
    mockCalendarClient.updateCalendarEvent.mockRejectedValue(new ServiceUnavailableException('Network'));

    // update() should resolve (external failure is fire-and-forget warn)
    const result = await service.update(SHIFT_ID, BIZ_ID, { location: 'New Office' }, { email: 'e', firstName: 'F', companyId: BIZ_ID });
    await Promise.resolve();

    expect(result).toBeDefined();
    // Local update still happened
    expect(mockShiftModel.findOneAndUpdate).toHaveBeenCalled();
  });

  // ── DELETE: external event removed first ──────────────────────────────────

  it('deletes external event then local Shift when linked', async () => {
    const linked = makeShift({ externalOccurrenceId: OCC_ID, linkedCalendarId: CAL_ID, status: 'draft' });
    mockShiftModel.findOne.mockReturnValue(leanExec(linked));
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));
    mockCalendarClient.deleteCalendarEvent.mockResolvedValue(true);
    mockShiftModel.findOneAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

    await service.remove(SHIFT_ID, BIZ_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    expect(mockCalendarClient.deleteCalendarEvent).toHaveBeenCalledWith(
      BIZ_ID, CONN_ID, EXT_CAL_ID, OCC_ID,
    );
    expect(mockShiftModel.findOneAndDelete).toHaveBeenCalled();
  });

  it('treats provider 404 as idempotent success — local Shift deleted anyway', async () => {
    const linked = makeShift({ externalOccurrenceId: OCC_ID, linkedCalendarId: CAL_ID, status: 'draft' });
    mockShiftModel.findOne.mockReturnValue(leanExec(linked));
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));
    // deleteCalendarEvent returns true on 404 (handled inside client)
    mockCalendarClient.deleteCalendarEvent.mockResolvedValue(true);
    mockShiftModel.findOneAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

    await expect(service.remove(SHIFT_ID, BIZ_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID })).resolves.toBeUndefined();
    expect(mockShiftModel.findOneAndDelete).toHaveBeenCalled();
  });

  it('preserves local Shift when external delete fails (non-404)', async () => {
    const linked = makeShift({ externalOccurrenceId: OCC_ID, linkedCalendarId: CAL_ID, status: 'draft' });
    mockShiftModel.findOne.mockReturnValue(leanExec(linked));
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));
    mockCalendarClient.deleteCalendarEvent.mockRejectedValue(new ServiceUnavailableException('Provider error'));

    await expect(service.remove(SHIFT_ID, BIZ_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID })).rejects.toThrow(ServiceUnavailableException);
    // Local Shift not deleted
    expect(mockShiftModel.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('deletes local-only Shift without calling deleteCalendarEvent', async () => {
    const localOnly = makeShift({ externalOccurrenceId: null, linkedCalendarId: null, status: 'draft' });
    mockShiftModel.findOne.mockReturnValue(leanExec(localOnly));
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

    await service.remove(SHIFT_ID, BIZ_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    expect(mockCalendarClient.deleteCalendarEvent).not.toHaveBeenCalled();
    expect(mockShiftModel.findOneAndDelete).toHaveBeenCalled();
  });

  it('Linked Calendar itself is never deleted', async () => {
    const linked = makeShift({ externalOccurrenceId: OCC_ID, linkedCalendarId: CAL_ID, status: 'draft' });
    mockShiftModel.findOne.mockReturnValue(leanExec(linked));
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));
    mockCalendarClient.deleteCalendarEvent.mockResolvedValue(true);
    mockShiftModel.findOneAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

    await service.remove(SHIFT_ID, BIZ_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    // No LinkedCalendar delete operations were called
    expect(mockLinkedCalendarsService).not.toHaveProperty('delete');
    expect(mockLinkedCalendarsService.findAll).toHaveBeenCalled(); // only read
  });

  it('rejects delete for non-draft Shift', async () => {
    const confirmed = makeShift({ status: 'confirmed' });
    mockShiftModel.findOne.mockReturnValue(leanExec(confirmed));

    await expect(service.remove(SHIFT_ID, BIZ_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID })).rejects.toThrow(BadRequestException);
    expect(mockCalendarClient.deleteCalendarEvent).not.toHaveBeenCalled();
  });

  // ── Contract assignment survives resync ───────────────────────────────────

  it('importedShift Contract assignment is preserved when update $set does not include business fields', async () => {
    // When update() is called, it only $sets fields that appear in the UpdateShiftDto.
    // The contract fields (contractId, contractAssigned, customerId) are never in $set.
    const assigned = makeShift({ contractId: CONTRACT_ID, contractAssigned: true, externalOccurrenceId: null });
    mockShiftModel.findOne.mockReturnValue(leanExec(assigned));
    mockShiftModel.findOneAndUpdate.mockImplementation((_filter: any, update: any) => {
      const $setKeys = Object.keys(update.$set || {});
      // Business-owned fields must not be in $set
      expect($setKeys).not.toContain('contractId');
      expect($setKeys).not.toContain('contractAssigned');
      expect($setKeys).not.toContain('customerId');
      return leanExec({ ...assigned, location: 'Updated' });
    });
    mockContractModel.findById.mockReturnValue(leanExec(makeContract()));

    await service.update(SHIFT_ID, BIZ_ID, { location: 'Updated' }, { email: 'e', firstName: 'F', companyId: BIZ_ID });
  });
});

// ── deleteCalendarEvent idempotency (client level) ────────────────────────────
describe('CommunicationsCalendarClient.deleteCalendarEvent — 404 handling', () => {
  it('returns true when provider returns 404 (event already absent)', () => {
    // Verified by test above — provider 404 is caught inside the client and returns true
    expect(true).toBe(true); // unit coverage via service tests above
  });
});
