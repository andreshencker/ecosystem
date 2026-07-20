import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
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
const CUSTOMER_ID = '507f1f77bcf86cd799439013';
const OTHER_BIZ   = 'biz-other';

function ctx(): AuthContext {
  return { actorType: 'user', userId: 'u1', role: 'business_owner', scope: 'company', companyId: BIZ_ID, email: 'owner@biz.com' } as any;
}

function makeShift(overrides: Record<string, any> = {}) {
  return {
    _id:                 SHIFT_ID,
    businessId:          BIZ_ID,
    contractId:          null,
    customerId:          null,
    contractAssigned:    false,
    status:              'draft',
    createdFromCalendar: true,
    linkedCalendarId:    'cal1',
    date:                '2026-07-18',
    startTime:           '09:00',
    endTime:             '17:00',
    breakMinutes:        null,
    location:            null,
    notes:               null,
    calendarProvider:    'icloud',
    calendarAccount:     'user@icloud.com',
    calendarName:        'Work',
    title:               'Shift title',
    syncStatus:          'synced',
    createdAt:           new Date(),
    updatedAt:           new Date(),
    ...overrides,
  };
}

function makeContract(overrides: Record<string, any> = {}) {
  return {
    _id:          CONTRACT_ID,
    businessId:   BIZ_ID,
    customerId:   CUSTOMER_ID,
    positionName: 'Developer',
    status:       'active',
    ...overrides,
  };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSession: any = {
  startTransaction:  jest.fn(),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  abortTransaction:  jest.fn().mockResolvedValue(undefined),
  endSession:        jest.fn().mockResolvedValue(undefined),
};

const mockShiftModel: any = {
  findOne:          jest.fn(),
  findOneAndUpdate: jest.fn(),
  find:             jest.fn(),
  create:           jest.fn(),
  countDocuments:   jest.fn(),
  updateMany:       jest.fn(),
  db:               { startSession: jest.fn().mockResolvedValue(mockSession) },
};

const mockContractModel: any = { findOne: jest.fn() };
const mockHistoryModel: any  = { create: jest.fn(), findOneAndUpdate: jest.fn() };
const mockCommClient: any    = { notifyEvent: jest.fn().mockResolvedValue(true) };
const mockUsersService: any  = { getCompanyDisplayName: jest.fn().mockResolvedValue('Biz Name') };
const mockLinkedCalendarsService: any = { findAll: jest.fn().mockResolvedValue([]) };
const mockCalendarClient: any         = { listCalendarEvents: jest.fn().mockResolvedValue([]) };
const mockBiService: any              = { syncModel: jest.fn().mockResolvedValue({ inserted: 0, updated: 0 }) };

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

// Helper: make findOne chainable (lean().exec())
function leanExec(value: any) {
  const leanFn = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) });
  return { lean: leanFn, select: jest.fn().mockReturnValue({ lean: leanFn }) };
}
function leanExecFOU(value: any) {
  return { lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }) };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('ShiftsService.assignContract', () => {
  let service: ShiftsService;
  let controller: ShiftsController;

  beforeEach(async () => {
    const mod  = await buildModule();
    service    = mod.get(ShiftsService);
    controller = mod.get(ShiftsController);
    jest.clearAllMocks();
  });

  it('assigns a valid Contract — sets contractId, customerId, contractAssigned=true', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU({ ...makeShift(), contractId: CONTRACT_ID, customerId: CUSTOMER_ID, contractAssigned: true }),
    );

    const result = await service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    expect((result as any).contractId).toBe(CONTRACT_ID);
    expect((result as any).contractAssigned).toBe(true);
    expect(mockShiftModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: SHIFT_ID, businessId: BIZ_ID },
      { $set: expect.objectContaining({ contractId: CONTRACT_ID, contractAssigned: true }) },
      { new: true },
    );
  });

  it('resolves customerId from Contract — never trusts caller', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract({ customerId: CUSTOMER_ID })));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU({ ...makeShift(), contractId: CONTRACT_ID, customerId: CUSTOMER_ID, contractAssigned: true }),
    );

    await service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    const updateCall = mockShiftModel.findOneAndUpdate.mock.calls[0][1];
    expect(updateCall.$set.customerId).toBe(CUSTOMER_ID);
  });

  it('throws NotFoundException for missing shift', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(null));
    await expect(
      service.assignContract('nonexistent', BIZ_ID, CONTRACT_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException for Contract in different Business (cross-tenant)', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    // Contract lookup with businessId filter returns null → wrong business
    mockContractModel.findOne.mockReturnValue(leanExec(null));
    await expect(
      service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for invalid contractId format', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    await expect(
      service.assignContract(SHIFT_ID, BIZ_ID, 'not-a-mongo-id', { email: 'e', firstName: 'F', companyId: BIZ_ID }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for cancelled shift', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift({ status: 'cancelled' })));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    await expect(
      service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows reassignment — replaces contractId and customerId', async () => {
    const NEW_CONTRACT_ID = '507f1f77bcf86cd799439099';
    const NEW_CUSTOMER_ID = '507f1f77bcf86cd799439098';
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift({ contractId: CONTRACT_ID, contractAssigned: true })));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract({ _id: NEW_CONTRACT_ID, customerId: NEW_CUSTOMER_ID })));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU({ ...makeShift(), contractId: NEW_CONTRACT_ID, customerId: NEW_CUSTOMER_ID, contractAssigned: true }),
    );

    const result = await service.assignContract(SHIFT_ID, BIZ_ID, NEW_CONTRACT_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    expect((result as any).contractId).toBe(NEW_CONTRACT_ID);
    expect((result as any).customerId).toBe(NEW_CUSTOMER_ID);
  });

  it('preserves calendar metadata during assignment', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    let updatePayload: any;
    mockShiftModel.findOneAndUpdate.mockImplementation((_f: any, update: any) => {
      updatePayload = update;
      return leanExecFOU({ ...makeShift(), ...update.$set });
    });

    await service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID });

    // $set should NOT touch calendar fields
    const setKeys = Object.keys(updatePayload.$set);
    expect(setKeys).not.toContain('linkedCalendarId');
    expect(setKeys).not.toContain('calendarProvider');
    expect(setKeys).not.toContain('calendarAccount');
    expect(setKeys).not.toContain('externalOccurrenceId');
    expect(setKeys).not.toContain('syncStatus');
  });

  it('fires shift_updated notification fire-and-forget', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU({ ...makeShift(), contractId: CONTRACT_ID, customerId: CUSTOMER_ID, contractAssigned: true }),
    );

    await service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, { email: 'e@x.com', firstName: 'F', companyId: BIZ_ID });

    // Notification is fire-and-forget — give it a tick to fire
    await Promise.resolve();
    expect(mockCommClient.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'shifts.shift_updated' }),
    );
  });

  it('does not emit notification if persistence fails', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU(null), // persistence returns null → NotFoundException
    );

    await expect(
      service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, { email: 'e', firstName: 'F', companyId: BIZ_ID }),
    ).rejects.toThrow(NotFoundException);

    await Promise.resolve();
    expect(mockCommClient.notifyEvent).not.toHaveBeenCalled();
  });
});

describe('ShiftsController.assignContract', () => {
  let controller: ShiftsController;

  beforeEach(async () => {
    const mod  = await buildModule();
    controller = mod.get(ShiftsController);
    jest.clearAllMocks();
  });

  it('rejects user without companyId with 403', async () => {
    const noCompanyCtx = { ...ctx(), companyId: undefined } as any;
    await expect(
      controller.assignContract(noCompanyCtx, SHIFT_ID, { contractId: CONTRACT_ID }),
    ).rejects.toThrow(ForbiddenException);
  });
});
