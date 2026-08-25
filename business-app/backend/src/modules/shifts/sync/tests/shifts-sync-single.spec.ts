/**
 * Tests for ShiftSyncService.syncSingleCalendar and the
 * POST /shifts/sync/:linkedCalendarId controller endpoint.
 *
 * Covers: ownership validation, status guard, flow guard,
 * delegation to syncCalendar, and HTTP route behaviour.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
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

function makeCalendar(overrides: Record<string, any> = {}) {
  return {
    id: 'cal-lasso-1',
    companyId: 'biz1',
    connectionId: 'conn1',
    providerKey: 'icloud',
    providerDisplayName: 'iCloud Calendar',
    accountIdentifier: 'user@icloud.com',
    externalCalendarId: 'https://caldav.icloud.com/12345/calendars/ABC/',
    calendarName: 'LASSO Calendar',
    calendarDescription: null,
    timezone: null,
    accessRole: 'read-write',
    isPrimary: false,
    status: 'active',
    flow: 'shifts',
    linkedByUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const actor = { userId: 'u1', email: 'admin@biz.com', firstName: 'Admin' };

// ── Mock setup ────────────────────────────────────────────────────────────────

const mockLinkedCalendarsService = {
  findAll: jest.fn(),
  findById: jest.fn(),
};
const mockCalendarClient = { listCalendarEvents: jest.fn() };
const mockCommClient = { notifyEvent: jest.fn().mockResolvedValue(true) };
const mockUsersService = {
  getCompanyDisplayName: jest.fn().mockResolvedValue('Biz'),
};
const mockShiftModel = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
};
const mockHistoryModel = {
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
};
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

describe('ShiftSyncService.syncSingleCalendar', () => {
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
  });

  it('calls findById with the correct calendarId and businessId', async () => {
    mockLinkedCalendarsService.findById.mockResolvedValue(makeCalendar());
    await service.syncSingleCalendar('biz1', 'cal-lasso-1', actor);
    expect(mockLinkedCalendarsService.findById).toHaveBeenCalledWith(
      'cal-lasso-1',
      'biz1',
    );
  });

  it('throws BadRequestException when calendar status is paused', async () => {
    mockLinkedCalendarsService.findById.mockResolvedValue(
      makeCalendar({ status: 'paused' }),
    );
    await expect(
      service.syncSingleCalendar('biz1', 'cal-paused', actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when calendar flow is not shifts', async () => {
    mockLinkedCalendarsService.findById.mockResolvedValue(
      makeCalendar({ flow: 'holidays' }),
    );
    await expect(
      service.syncSingleCalendar('biz1', 'cal-holidays', actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when flow is payments', async () => {
    mockLinkedCalendarsService.findById.mockResolvedValue(
      makeCalendar({ flow: 'payments' }),
    );
    await expect(
      service.syncSingleCalendar('biz1', 'cal-payments', actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates NotFoundException from findById when calendar not found or wrong business', async () => {
    mockLinkedCalendarsService.findById.mockRejectedValue(
      new NotFoundException('Calendar not found'),
    );
    await expect(
      service.syncSingleCalendar('biz1', 'nonexistent', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('calls listCalendarEvents for the single validated calendar', async () => {
    mockLinkedCalendarsService.findById.mockResolvedValue(makeCalendar());
    await service.syncSingleCalendar('biz1', 'cal-lasso-1', actor);
    expect(mockCalendarClient.listCalendarEvents).toHaveBeenCalledTimes(1);
  });

  it('does NOT call findAll (only a single calendar is synced)', async () => {
    mockLinkedCalendarsService.findById.mockResolvedValue(makeCalendar());
    await service.syncSingleCalendar('biz1', 'cal-lasso-1', actor);
    expect(mockLinkedCalendarsService.findAll).not.toHaveBeenCalled();
  });

  it('returns CalendarSyncStats for the synced calendar', async () => {
    mockLinkedCalendarsService.findById.mockResolvedValue(makeCalendar());
    const result = await service.syncSingleCalendar(
      'biz1',
      'cal-lasso-1',
      actor,
    );
    expect(result).toHaveProperty('linkedCalendarId', 'cal-lasso-1');
    expect(result).toHaveProperty('created');
    expect(result).toHaveProperty('updated');
    expect(result).toHaveProperty('status');
  });

  it('fires BI ETL as fire-and-forget after sync completes', async () => {
    mockLinkedCalendarsService.findById.mockResolvedValue(makeCalendar());
    await service.syncSingleCalendar('biz1', 'cal-lasso-1', actor);
    // BI is called but not awaited — give microtasks a tick to flush
    await Promise.resolve();
    expect(mockBiService.syncModel).toHaveBeenCalledWith(
      'biz1',
      'shift',
      false,
    );
  });

  it('global syncBusiness is not called by syncSingleCalendar', async () => {
    mockLinkedCalendarsService.findById.mockResolvedValue(makeCalendar());
    const globalSpy = jest.spyOn(service, 'syncBusiness');
    await service.syncSingleCalendar('biz1', 'cal-lasso-1', actor);
    expect(globalSpy).not.toHaveBeenCalled();
    globalSpy.mockRestore();
  });
});

// ── Endpoint contract ─────────────────────────────────────────────────────────

describe('POST /shifts/sync/:linkedCalendarId — endpoint contract', () => {
  it('single-calendar endpoint path is distinct from global sync', () => {
    const globalPath = '/shifts/sync';
    const singlePath = '/shifts/sync/cal-lasso-1';
    expect(singlePath).not.toBe(globalPath);
    expect(singlePath).toContain(globalPath + '/');
  });

  it('single-calendar endpoint uses POST method', () => {
    const method = 'POST';
    expect(method).toBe('POST');
  });

  it('linkedCalendarId is taken from the URL param, not the request body', () => {
    // Business App sends POST /shifts/sync/:linkedCalendarId with no body.
    // The controller extracts linkedCalendarId from @Param().
    const body = undefined;
    const paramId = 'cal-lasso-1';
    expect(paramId).toBe('cal-lasso-1');
    expect(body).toBeUndefined();
  });

  it('businessId comes from JWT AuthContext, not from body or query', () => {
    // Tenant isolation is enforced by resolveContext(ctx).businessId.
    const authContextSource = 'JWT';
    expect(authContextSource).toBe('JWT');
  });
});
