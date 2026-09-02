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
import { Customer } from '../../customer/schemas/customer.schema';
import { SyncHistory } from '../sync/schemas/sync-history.schema';
import { RelayClientService } from '../../../integrations/relay/client/relay-client.service';
import { UsersService } from '../../users/users.service';
import { LinkedCalendarsService } from '../../linked-calendars/linked-calendars.service';
import { RelayCalendarClient } from '../../linked-calendars/clients/relay-calendar.client';
import { BusinessIntelligenceService } from '../../../integrations/business-intelligence/business-intelligence.service';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BIZ_ID = 'biz1';
const SHIFT_ID = '507f1f77bcf86cd799439011';
const CONTRACT_ID = '507f1f77bcf86cd799439012';
const CUSTOMER_ID = '507f1f77bcf86cd799439013';
const OTHER_BIZ = 'biz-other';

function ctx(): AuthContext {
  return {
    actorType: 'user',
    userId: 'u1',
    role: 'business_owner',
    scope: 'company',
    companyId: BIZ_ID,
    email: 'owner@biz.com',
  } as any;
}

function makeShift(overrides: Record<string, any> = {}) {
  return {
    _id: SHIFT_ID,
    businessId: BIZ_ID,
    contractId: null,
    customerId: null,
    contractAssigned: false,
    status: 'draft',
    createdFromCalendar: true,
    linkedCalendarId: 'cal1',
    date: '2026-07-18',
    startTime: '09:00',
    endTime: '17:00',
    breakTaken: false,
    location: null,
    notes: null,
    calendarProvider: 'icloud',
    calendarAccount: 'user@icloud.com',
    calendarName: 'Work',
    title: 'Shift title',
    syncStatus: 'synced',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeContract(overrides: Record<string, any> = {}) {
  return {
    _id: CONTRACT_ID,
    businessId: BIZ_ID,
    customerId: CUSTOMER_ID,
    positionName: 'Developer',
    status: 'active',
    ...overrides,
  };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSession: any = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  abortTransaction: jest.fn().mockResolvedValue(undefined),
  endSession: jest.fn().mockResolvedValue(undefined),
};

const mockShiftModel: any = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
  db: { startSession: jest.fn().mockResolvedValue(mockSession) },
};

const mockContractModel: any = { findOne: jest.fn() };
const mockCustomerModel: any = { findById: jest.fn(), find: jest.fn() };
const mockHistoryModel: any = {
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
};
const mockCommClient: any = { notifyEvent: jest.fn().mockResolvedValue(true) };
const mockUsersService: any = {
  getCompanyDisplayName: jest.fn().mockResolvedValue('Biz Name'),
};
const mockLinkedCalendarsService: any = {
  findAll: jest.fn().mockResolvedValue([]),
};
const mockCalendarClient: any = {
  listCalendarEvents: jest.fn().mockResolvedValue([]),
};
const mockBiService: any = {
  syncModel: jest.fn().mockResolvedValue({ inserted: 0, updated: 0 }),
};

function leanExecCustomer(value: any) {
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
      { provide: getModelToken(Shift.name), useValue: mockShiftModel },
      { provide: getModelToken(Contract.name), useValue: mockContractModel },
      { provide: getModelToken(Customer.name), useValue: mockCustomerModel },
      { provide: getModelToken(SyncHistory.name), useValue: mockHistoryModel },
      { provide: RelayClientService, useValue: mockCommClient },
      { provide: UsersService, useValue: mockUsersService },
      { provide: LinkedCalendarsService, useValue: mockLinkedCalendarsService },
      { provide: RelayCalendarClient, useValue: mockCalendarClient },
      { provide: BusinessIntelligenceService, useValue: mockBiService },
    ],
  }).compile();
}

// Helper: make findOne chainable (lean().exec())
function leanExec(value: any) {
  const leanFn = jest
    .fn()
    .mockReturnValue({ exec: jest.fn().mockResolvedValue(value) });
  return { lean: leanFn, select: jest.fn().mockReturnValue({ lean: leanFn }) };
}
function leanExecFOU(value: any) {
  return {
    lean: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('ShiftsService.assignContract', () => {
  let service: ShiftsService;
  let controller: ShiftsController;

  beforeEach(async () => {
    const mod = await buildModule();
    service = mod.get(ShiftsService);
    controller = mod.get(ShiftsController);
    jest.clearAllMocks();
    mockCustomerModel.findById.mockReturnValue(
      leanExecCustomer({ _id: CUSTOMER_ID, displayName: 'Jay Productions' }),
    );
    mockCustomerModel.find.mockReturnValue(leanExecCustomer([]));
  });

  it('assigns a valid Contract — sets contractId, customerId, contractAssigned=true', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU({
        ...makeShift(),
        contractId: CONTRACT_ID,
        customerId: CUSTOMER_ID,
        contractAssigned: true,
      }),
    );

    const result = await service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, {
      email: 'e',
      firstName: 'F',
      companyId: BIZ_ID,
    });

    expect((result as any).contractId).toBe(CONTRACT_ID);
    expect((result as any).contractAssigned).toBe(true);
    expect(mockShiftModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: SHIFT_ID, businessId: BIZ_ID },
      {
        $set: expect.objectContaining({
          contractId: CONTRACT_ID,
          contractAssigned: true,
        }),
      },
      { new: true },
    );
  });

  it('resolves customerId from Contract — never trusts caller', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(
      leanExec(makeContract({ customerId: CUSTOMER_ID })),
    );
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU({
        ...makeShift(),
        contractId: CONTRACT_ID,
        customerId: CUSTOMER_ID,
        contractAssigned: true,
      }),
    );

    await service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, {
      email: 'e',
      firstName: 'F',
      companyId: BIZ_ID,
    });

    const updateCall = mockShiftModel.findOneAndUpdate.mock.calls[0][1];
    expect(updateCall.$set.customerId).toBe(CUSTOMER_ID);
  });

  it('throws NotFoundException for missing shift', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(null));
    await expect(
      service.assignContract('nonexistent', BIZ_ID, CONTRACT_ID, {
        email: 'e',
        firstName: 'F',
        companyId: BIZ_ID,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException for Contract in different Business (cross-tenant)', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    // Contract lookup with businessId filter returns null → wrong business
    mockContractModel.findOne.mockReturnValue(leanExec(null));
    await expect(
      service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, {
        email: 'e',
        firstName: 'F',
        companyId: BIZ_ID,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for invalid contractId format', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    await expect(
      service.assignContract(SHIFT_ID, BIZ_ID, 'not-a-mongo-id', {
        email: 'e',
        firstName: 'F',
        companyId: BIZ_ID,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for cancelled shift', async () => {
    mockShiftModel.findOne.mockReturnValue(
      leanExec(makeShift({ status: 'cancelled' })),
    );
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    await expect(
      service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, {
        email: 'e',
        firstName: 'F',
        companyId: BIZ_ID,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows reassignment — replaces contractId and customerId', async () => {
    const NEW_CONTRACT_ID = '507f1f77bcf86cd799439099';
    const NEW_CUSTOMER_ID = '507f1f77bcf86cd799439098';
    mockShiftModel.findOne.mockReturnValue(
      leanExec(makeShift({ contractId: CONTRACT_ID, contractAssigned: true })),
    );
    mockContractModel.findOne.mockReturnValue(
      leanExec(
        makeContract({ _id: NEW_CONTRACT_ID, customerId: NEW_CUSTOMER_ID }),
      ),
    );
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU({
        ...makeShift(),
        contractId: NEW_CONTRACT_ID,
        customerId: NEW_CUSTOMER_ID,
        contractAssigned: true,
      }),
    );

    const result = await service.assignContract(
      SHIFT_ID,
      BIZ_ID,
      NEW_CONTRACT_ID,
      { email: 'e', firstName: 'F', companyId: BIZ_ID },
    );

    expect((result as any).contractId).toBe(NEW_CONTRACT_ID);
    expect((result as any).customerId).toBe(NEW_CUSTOMER_ID);
  });

  it('preserves calendar metadata during assignment', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    let updatePayload: any;
    mockShiftModel.findOneAndUpdate.mockImplementation(
      (_f: any, update: any) => {
        updatePayload = update;
        return leanExecFOU({ ...makeShift(), ...update.$set });
      },
    );

    await service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, {
      email: 'e',
      firstName: 'F',
      companyId: BIZ_ID,
    });

    // $set should NOT touch calendar fields
    const setKeys = Object.keys(updatePayload.$set);
    expect(setKeys).not.toContain('linkedCalendarId');
    expect(setKeys).not.toContain('calendarProvider');
    expect(setKeys).not.toContain('calendarAccount');
    expect(setKeys).not.toContain('externalOccurrenceId');
    expect(setKeys).not.toContain('syncStatus');
  });

  // TODO(shifts-notifications): update this test when notifications are re-enabled.
  // When re-enabled, the call MUST use type: 'platform' (not 'business').
  it('notifyEvent is currently disabled — no notification fires on assignContract', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU({
        ...makeShift(),
        contractId: CONTRACT_ID,
        customerId: CUSTOMER_ID,
        contractAssigned: true,
      }),
    );

    await service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, {
      email: 'e@x.com',
      firstName: 'F',
      companyId: BIZ_ID,
    });

    await Promise.resolve();
    // Notification is intentionally disabled — _notify() is a no-op.
    // Re-enable this expectation (with type: 'platform') once strategy is approved.
    expect(mockCommClient.notifyEvent).not.toHaveBeenCalled();
  });

  it('does not emit notification if persistence fails', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExecFOU(null), // persistence returns null → NotFoundException
    );

    await expect(
      service.assignContract(SHIFT_ID, BIZ_ID, CONTRACT_ID, {
        email: 'e',
        firstName: 'F',
        companyId: BIZ_ID,
      }),
    ).rejects.toThrow(NotFoundException);

    await Promise.resolve();
    expect(mockCommClient.notifyEvent).not.toHaveBeenCalled();
  });
});

// ─── breakTaken field contract ────────────────────────────────────────────────

describe('Shift.breakTaken — toShiftResponse mapper', () => {
  // Tests exercise the response mapper directly — no NestJS module bootstrap needed.
  const { toShiftResponse } = require('../dto/shift-response.dto');

  function makeDoc(overrides: Record<string, any> = {}) {
    return {
      ...makeShift({ createdAt: new Date(), updatedAt: new Date() }),
      ...overrides,
    };
  }

  it('defaults to false when breakTaken is absent from the stored document', () => {
    const result = toShiftResponse(makeDoc({ breakTaken: undefined }));
    expect(result.breakTaken).toBe(false);
  });

  it('maps breakTaken = true correctly', () => {
    const result = toShiftResponse(makeDoc({ breakTaken: true }));
    expect(result.breakTaken).toBe(true);
  });

  it('maps breakTaken = false correctly', () => {
    const result = toShiftResponse(makeDoc({ breakTaken: false }));
    expect(result.breakTaken).toBe(false);
  });

  it('response DTO does not contain breakMinutes', () => {
    const result = toShiftResponse(makeDoc({ breakTaken: false }));
    expect(result).not.toHaveProperty('breakMinutes');
  });

  it('legacy document with breakMinutes > 0 and no breakTaken field defaults to false (pre-migration)', () => {
    // Pre-migration documents have breakMinutes but no breakTaken.
    // toShiftResponse falls back to false until the migration script runs.
    const result = toShiftResponse(
      makeDoc({ breakMinutes: 30, breakTaken: undefined }),
    );
    expect(result.breakTaken).toBe(false);
    expect(result).not.toHaveProperty('breakMinutes');
  });
});

describe('Shift.breakTaken — update $set filter', () => {
  let service: ShiftsService;

  beforeEach(async () => {
    const mod = await buildModule();
    service = mod.get(ShiftsService);
    jest.clearAllMocks();
    // The update flow resolves the contract summary via findById after persisting.
    mockContractModel.findById = jest
      .fn()
      .mockReturnValue(leanExec(makeContract()));
    mockCustomerModel.findById.mockReturnValue(
      leanExecCustomer({ _id: CUSTOMER_ID, displayName: 'Jay' }),
    );
  });

  it('breakTaken is included in $set when provided in update DTO', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    let capturedUpdate: any;
    mockShiftModel.findOneAndUpdate.mockImplementation(
      (_f: any, update: any) => {
        capturedUpdate = update;
        return leanExecFOU(makeShift({ breakTaken: false }));
      },
    );

    await service.update(
      SHIFT_ID,
      BIZ_ID,
      { breakTaken: false },
      { companyId: BIZ_ID, email: 'e', firstName: 'F' },
    );

    expect(capturedUpdate.$set.breakTaken).toBe(false);
  });

  it('breakTaken=true to false transition is persisted', async () => {
    mockShiftModel.findOne.mockReturnValue(
      leanExec(makeShift({ breakTaken: true })),
    );
    let capturedUpdate: any;
    mockShiftModel.findOneAndUpdate.mockImplementation(
      (_f: any, update: any) => {
        capturedUpdate = update;
        return leanExecFOU(makeShift({ breakTaken: false }));
      },
    );

    await service.update(
      SHIFT_ID,
      BIZ_ID,
      { breakTaken: false },
      { companyId: BIZ_ID, email: 'e', firstName: 'F' },
    );

    expect(capturedUpdate.$set.breakTaken).toBe(false);
  });

  it('breakTaken false to true transition is persisted', async () => {
    mockShiftModel.findOne.mockReturnValue(
      leanExec(makeShift({ breakTaken: false })),
    );
    let capturedUpdate: any;
    mockShiftModel.findOneAndUpdate.mockImplementation(
      (_f: any, update: any) => {
        capturedUpdate = update;
        return leanExecFOU(makeShift({ breakTaken: true }));
      },
    );

    await service.update(
      SHIFT_ID,
      BIZ_ID,
      { breakTaken: true },
      { companyId: BIZ_ID, email: 'e', firstName: 'F' },
    );

    expect(capturedUpdate.$set.breakTaken).toBe(true);
  });

  it('breakMinutes is not present in $set for any update', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    let capturedUpdate: any;
    mockShiftModel.findOneAndUpdate.mockImplementation(
      (_f: any, update: any) => {
        capturedUpdate = update;
        return leanExecFOU(makeShift());
      },
    );

    await service.update(
      SHIFT_ID,
      BIZ_ID,
      { location: 'Sydney', breakTaken: true },
      { companyId: BIZ_ID, email: 'e', firstName: 'F' },
    );

    expect(capturedUpdate.$set).not.toHaveProperty('breakMinutes');
  });
});

describe('ShiftsController.assignContract', () => {
  let controller: ShiftsController;

  beforeEach(async () => {
    const mod = await buildModule();
    controller = mod.get(ShiftsController);
    jest.clearAllMocks();
  });

  it('rejects user without companyId with 403', async () => {
    const noCompanyCtx = { ...ctx(), companyId: undefined } as any;
    await expect(
      controller.assignContract(noCompanyCtx, SHIFT_ID, {
        contractId: CONTRACT_ID,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
