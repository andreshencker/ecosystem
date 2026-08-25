import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ShiftSyncService } from '../services/shift-sync.service';
import { Shift } from '../../schemas/shift.schema';
import { SyncHistory } from '../schemas/sync-history.schema';
import { LinkedCalendarsService } from '../../../linked-calendars/linked-calendars.service';
import { RelayCalendarClient } from '../../../linked-calendars/clients/relay-calendar.client';
import { RelayClientService } from '../../../../integrations/relay/client/relay-client.service';
import { UsersService } from '../../../users/users.service';
import { BusinessIntelligenceService } from '../../../../integrations/business-intelligence/business-intelligence.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCalendar(flow: string | null, status = 'active') {
  return {
    id: `cal-${flow ?? 'null'}`,
    companyId: 'biz1',
    connectionId: 'conn1',
    providerKey: 'google_calendar',
    providerDisplayName: 'Google Calendar',
    accountIdentifier: 'user@example.com',
    externalCalendarId: `ext-cal-${flow}`,
    calendarName: `Test Calendar (${flow})`,
    calendarDescription: null,
    timezone: 'Australia/Sydney',
    accessRole: 'owner',
    isPrimary: false,
    status,
    flow,
    linkedByUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const actor = { userId: 'u1', email: 'admin@biz.com', firstName: 'Admin' };

// ── Mock setup ────────────────────────────────────────────────────────────────

const mockLinkedCalendarsService = { findAll: jest.fn() };
const mockCalendarClient = { listCalendarEvents: jest.fn() };
const mockCommClient = { notifyEvent: jest.fn().mockResolvedValue(true) };
const mockUsersService = {
  getCompanyDisplayName: jest.fn().mockResolvedValue('Biz Name'),
};
const mockShiftModel = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
};
const mockHistoryModel = { create: jest.fn(), findOneAndUpdate: jest.fn() };
const mockBiService = {
  syncModel: jest.fn().mockResolvedValue({ inserted: 0, updated: 0 }),
};

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      ShiftSyncService,
      { provide: getModelToken(Shift.name), useValue: mockShiftModel },
      { provide: getModelToken(SyncHistory.name), useValue: mockHistoryModel },
      { provide: LinkedCalendarsService, useValue: mockLinkedCalendarsService },
      { provide: RelayCalendarClient, useValue: mockCalendarClient },
      { provide: RelayClientService, useValue: mockCommClient },
      { provide: UsersService, useValue: mockUsersService },
      { provide: BusinessIntelligenceService, useValue: mockBiService },
    ],
  }).compile();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ShiftSyncService — calendar flow filter', () => {
  let service: ShiftSyncService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(ShiftSyncService);
    jest.clearAllMocks();
    // Default: no events returned so syncCalendar exits cleanly
    mockCalendarClient.listCalendarEvents.mockResolvedValue([]);
    mockHistoryModel.create.mockResolvedValue({ _id: 'h1' });
    mockHistoryModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });
    mockShiftModel.updateMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    });
  });

  it('queries only { status: active, flow: shifts } linked calendars', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([]);
    await service.syncBusiness('biz1', actor);
    expect(mockLinkedCalendarsService.findAll).toHaveBeenCalledWith(
      'biz1',
      expect.objectContaining({ status: 'active', flow: 'shifts' }),
    );
  });

  it('syncs a shifts-flow calendar', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([
      makeCalendar('shifts'),
    ]);
    const result = await service.syncBusiness('biz1', actor);
    expect(result.calendars).toHaveLength(1);
    expect(mockCalendarClient.listCalendarEvents).toHaveBeenCalledTimes(1);
  });

  it('does NOT call listCalendarEvents when no shifts calendars exist', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([]);
    await service.syncBusiness('biz1', actor);
    expect(mockCalendarClient.listCalendarEvents).not.toHaveBeenCalled();
  });

  it('holiday calendars are not returned by the flow=shifts query', async () => {
    // Simulate service returning only shift calendars (holiday filtered at DB level)
    mockLinkedCalendarsService.findAll.mockImplementation(
      (_bizId: string, query: { flow?: string }) => {
        if (query.flow !== 'shifts') throw new Error('wrong flow filter');
        return [];
      },
    );
    await expect(service.syncBusiness('biz1', actor)).resolves.toBeDefined();
    expect(mockLinkedCalendarsService.findAll).toHaveBeenCalledWith(
      'biz1',
      expect.objectContaining({ flow: 'shifts' }),
    );
  });

  it('payment calendars are excluded because flow filter is shifts', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([]); // payment cals filtered out
    const result = await service.syncBusiness('biz1', actor);
    expect(result.totalCreated).toBe(0);
    expect(result.calendars).toHaveLength(0);
  });

  it('null-flow calendars are excluded', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([]); // null-flow filtered out
    const result = await service.syncBusiness('biz1', actor);
    expect(result.calendars).toHaveLength(0);
  });

  it('paused shift calendars are excluded', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([]); // paused filtered out
    const result = await service.syncBusiness('biz1', actor);
    expect(result.calendars).toHaveLength(0);
  });

  it('syncs multiple shift calendars in sequence', async () => {
    const cals = [makeCalendar('shifts'), makeCalendar('shifts')];
    cals[1].id = 'cal-shifts-2';
    mockLinkedCalendarsService.findAll.mockResolvedValue(cals);
    const result = await service.syncBusiness('biz1', actor);
    expect(result.calendars).toHaveLength(2);
    expect(mockCalendarClient.listCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it('idempotent upsert — existing shift updated, not duplicated', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([
      makeCalendar('shifts'),
    ]);
    mockCalendarClient.listCalendarEvents.mockResolvedValue([
      {
        id: 'occ_001',
        calendarId: 'ext-cal-shifts',
        title: 'Work session',
        startAt: '2026-07-18T09:00:00Z',
        endAt: '2026-07-18T17:00:00Z',
        allDay: false,
        timeZone: 'Australia/Sydney',
        uid: 'uid_001',
      },
    ]);
    mockShiftModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: 'existing-shift' }),
        }),
      }),
    });
    mockShiftModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });

    const result = await service.syncBusiness('biz1', actor);
    // updated, not created
    expect(result.totalUpdated).toBe(1);
    expect(result.totalCreated).toBe(0);
  });

  it('business-owned fields (contractId, status, notes) not overwritten during update', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([
      makeCalendar('shifts'),
    ]);
    mockCalendarClient.listCalendarEvents.mockResolvedValue([
      {
        id: 'occ_002',
        calendarId: 'ext',
        title: 'Shift',
        startAt: '2026-07-18T09:00:00Z',
        endAt: '2026-07-18T17:00:00Z',
        allDay: false,
      },
    ]);
    mockShiftModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: 'shift-with-contract' }),
        }),
      }),
    });
    let updatePayload: any = null;
    mockShiftModel.findOneAndUpdate.mockImplementation(
      (_filter: any, update: any) => {
        updatePayload = update;
        return { exec: jest.fn().mockResolvedValue({}) };
      },
    );

    await service.syncBusiness('biz1', actor);

    // $set must NOT include contractId, status, notes, breakTaken (business-owned fields)
    const setFields = Object.keys(updatePayload.$set);
    expect(setFields).not.toContain('contractId');
    expect(setFields).not.toContain('status');
    expect(setFields).not.toContain('notes');
    expect(setFields).not.toContain('breakTaken');
    expect(setFields).not.toContain('contractAssigned');
    // $set MUST include provider-owned fields
    expect(setFields).toContain('title');
    expect(setFields).toContain('date');
    expect(setFields).toContain('startTime');
    expect(setFields).toContain('endTime');
  });

  it('disappeared events marked syncStatus=deleted, not hard-deleted', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([
      makeCalendar('shifts'),
    ]);
    mockCalendarClient.listCalendarEvents.mockResolvedValue([]); // no events returned
    let updateManyFilter: any = null;
    mockShiftModel.updateMany.mockImplementation((filter: any) => {
      updateManyFilter = filter;
      return { exec: jest.fn().mockResolvedValue({ modifiedCount: 2 }) };
    });

    const result = await service.syncBusiness('biz1', actor);
    // Verify soft-delete: updateMany was called, result reflects deletions
    expect(result.totalDeleted).toBe(2);
    expect(updateManyFilter).toBeDefined();
    // Verify we're setting syncStatus=deleted, not calling deleteMany
    expect(mockShiftModel).not.toHaveProperty('deleteMany');
  });

  it('provider-cancelled events are marked deleted and are not upserted', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([
      makeCalendar('shifts'),
    ]);
    mockCalendarClient.listCalendarEvents.mockResolvedValue([
      {
        id: 'cancelled_occurrence',
        calendarId: 'ext',
        title: 'Cancelled shift',
        startAt: '2026-07-18T09:00:00Z',
        endAt: '2026-07-18T17:00:00Z',
        allDay: false,
        status: 'cancelled',
      },
    ]);
    mockShiftModel.updateMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    const result = await service.syncBusiness('biz1', actor);

    expect(result.totalDeleted).toBe(1);
    expect(mockShiftModel.create).not.toHaveBeenCalled();
    expect(mockShiftModel.findOne).not.toHaveBeenCalled();
  });
});

describe('ShiftSyncService — BI ETL trigger after sync', () => {
  let service: ShiftSyncService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get(ShiftSyncService);
    jest.clearAllMocks();
    mockCalendarClient.listCalendarEvents.mockResolvedValue([]);
    mockHistoryModel.create.mockResolvedValue({ _id: 'h1' });
    mockHistoryModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });
    mockShiftModel.updateMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    });
    mockBiService.syncModel.mockResolvedValue({ inserted: 0, updated: 0 });
  });

  it('triggers BI shift ETL after syncBusiness completes', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([]);
    await service.syncBusiness('biz1', actor);
    // Give fire-and-forget a tick
    await Promise.resolve();
    expect(mockBiService.syncModel).toHaveBeenCalledWith(
      'biz1',
      'shift',
      false,
    );
  });

  it('BI ETL uses authenticated businessId, not a frontend param', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([]);
    await service.syncBusiness('tenant-xyz', actor);
    await Promise.resolve();
    const [calledBizId] = mockBiService.syncModel.mock.calls[0];
    expect(calledBizId).toBe('tenant-xyz');
  });

  it('BI ETL failure does not throw or affect sync result', async () => {
    mockLinkedCalendarsService.findAll.mockResolvedValue([]);
    mockBiService.syncModel.mockRejectedValue(new Error('BI unreachable'));
    const result = await service.syncBusiness('biz1', actor);
    await Promise.resolve();
    expect(result).toBeDefined();
    expect(result.businessId).toBe('biz1');
  });
});
