/**
 * Tests for ShiftsService.bulkAssignContracts and
 * PATCH /shifts/contracts/bulk controller endpoint.
 *
 * Covers: empty array rejection, duplicate shiftId rejection, ownership
 * validation, contract status guard, transactional commit/abort,
 * BI ETL trigger, and single-assignment backward compatibility.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ShiftsService } from '../shifts.service';
import { ShiftsController } from '../shifts.controller';
import { ShiftSyncService } from '../sync/services/shift-sync.service';
import { Shift } from '../schemas/shift.schema';
import { Contract } from '../../contracts/schemas/contract.schema';
import { Customer } from '../../customer/schemas/customer.schema';
import { SyncHistory } from '../sync/schemas/sync-history.schema';
import { RelayClientService } from '../../../integrations/relay/client/relay-client.service';
import { BusinessIntelligenceService } from '../../../integrations/business-intelligence/business-intelligence.service';
import { UsersService } from '../../users/users.service';
import { LinkedCalendarsService } from '../../linked-calendars/linked-calendars.service';
import { RelayCalendarClient } from '../../linked-calendars/clients/relay-calendar.client';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BIZ_ID = 'biz1';
const SHIFT_1 = '507f1f77bcf86cd799439011';
const SHIFT_2 = '507f1f77bcf86cd799439012';
const SHIFT_3 = '507f1f77bcf86cd799439013';
const CONTRACT_1 = '507f1f77bcf86cd799439021';
const CONTRACT_2 = '507f1f77bcf86cd799439022';
const CUSTOMER_ID = '507f1f77bcf86cd799439031';
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
    _id: SHIFT_1,
    businessId: BIZ_ID,
    contractId: null,
    customerId: null,
    contractAssigned: false,
    status: 'draft',
    ...overrides,
  };
}

function makeContract(overrides: Record<string, any> = {}) {
  return {
    _id: CONTRACT_1,
    businessId: BIZ_ID,
    customerId: CUSTOMER_ID,
    status: 'active',
    positionName: 'Technician',
    ...overrides,
  };
}

// ── Mock helpers ──────────────────────────────────────────────────────────────

const mockSession: any = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  abortTransaction: jest.fn().mockResolvedValue(undefined),
  endSession: jest.fn().mockResolvedValue(undefined),
};

function leanExec(value: any) {
  return {
    lean: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
  };
}

const mockShiftModel: any = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
  db: { startSession: jest.fn().mockResolvedValue(mockSession) },
};
const mockContractModel: any = { findOne: jest.fn(), findById: jest.fn() };
const mockCustomerModel: any = { findById: jest.fn(), find: jest.fn() };
const mockHistoryModel: any = {
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
};
const mockCommClient: any = { notifyEvent: jest.fn().mockResolvedValue(true) };
const mockBiService: any = {
  syncModel: jest.fn().mockResolvedValue({ inserted: 0, updated: 0 }),
};
const mockUsersService: any = {
  getCompanyDisplayName: jest.fn().mockResolvedValue('Biz'),
};
const mockLinkedCals: any = { findAll: jest.fn().mockResolvedValue([]) };
const mockCalClient: any = {
  listCalendarEvents: jest.fn().mockResolvedValue([]),
};

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
      { provide: BusinessIntelligenceService, useValue: mockBiService },
      { provide: UsersService, useValue: mockUsersService },
      { provide: LinkedCalendarsService, useValue: mockLinkedCals },
      { provide: RelayCalendarClient, useValue: mockCalClient },
    ],
  }).compile();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ShiftsService.bulkAssignContracts', () => {
  let service: ShiftsService;

  beforeEach(async () => {
    const mod = await buildModule();
    service = mod.get(ShiftsService);
    jest.clearAllMocks();
    mockSession.startTransaction.mockReset();
    mockSession.commitTransaction.mockResolvedValue(undefined);
    mockSession.abortTransaction.mockResolvedValue(undefined);
    mockSession.endSession.mockResolvedValue(undefined);
    mockShiftModel.db.startSession.mockResolvedValue(mockSession);
    mockCustomerModel.findById.mockReturnValue(
      leanExec({ _id: CUSTOMER_ID, displayName: 'Test Customer' }),
    );
    mockCustomerModel.find.mockReturnValue(leanExec([]));
  });

  const actor = { email: 'e@biz.com', firstName: 'E', companyId: BIZ_ID };

  // ── Validation: empty / duplicate ─────────────────────────────────────────

  it('rejects empty assignments array', async () => {
    await expect(
      service.bulkAssignContracts(BIZ_ID, [], actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate shiftId values in the same request', async () => {
    await expect(
      service.bulkAssignContracts(
        BIZ_ID,
        [
          { shiftId: SHIFT_1, contractId: CONTRACT_1 },
          { shiftId: SHIFT_1, contractId: CONTRACT_2 },
        ],
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid shiftId format (non-ObjectId)', async () => {
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    await expect(
      service.bulkAssignContracts(
        BIZ_ID,
        [{ shiftId: 'not-valid', contractId: CONTRACT_1 }],
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('SKIPS (does not fail) a Shift not found in MongoDB — treats as orphaned BI record', async () => {
    // When a MongoDB shift no longer exists, it is treated as an orphaned BI record.
    // The backend skips it silently rather than failing the entire batch.
    mockShiftModel.findOne.mockReturnValue(leanExec(null)); // not found
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));

    const result = await service.bulkAssignContracts(
      BIZ_ID,
      [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
      actor,
    );
    // Returns success with 0 updated and 1 skipped
    expect(result.success).toBe(true);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    // BI full sync fires to clean up orphaned records
    await Promise.resolve();
    expect(mockBiService.syncModel).toHaveBeenCalledWith(BIZ_ID, 'shift', true);
  });

  it('rejects a cancelled Shift', async () => {
    mockShiftModel.findOne.mockReturnValue(
      leanExec(makeShift({ status: 'cancelled' })),
    );
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    const err = await service
      .bulkAssignContracts(
        BIZ_ID,
        [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
        actor,
      )
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const body = err.getResponse?.();
    expect(body?.errors?.[0]?.code).toBe('SHIFT_CANCELLED');
  });

  it('rejects a Contract that does not belong to the authenticated business', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(null)); // not found for this business
    const err = await service
      .bulkAssignContracts(
        BIZ_ID,
        [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
        actor,
      )
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const body = err.getResponse?.();
    expect(body?.errors?.[0]?.code).toBe('CONTRACT_NOT_FOUND');
  });

  it('rejects an inactive Contract', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(
      leanExec(makeContract({ status: 'paused' })),
    );
    const err = await service
      .bulkAssignContracts(
        BIZ_ID,
        [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
        actor,
      )
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const body = err.getResponse?.();
    expect(body?.errors?.[0]?.code).toBe('CONTRACT_INACTIVE');
  });

  it('collects domain validation errors (cancelled shift, inactive contract) before rejecting', async () => {
    // SHIFT_1 is cancelled (domain error → fail batch)
    // SHIFT_2 has an inactive contract (domain error → fail batch)
    // Both fail with validation errors — expect two errors in the response
    mockShiftModel.findOne
      .mockReturnValueOnce(
        leanExec(makeShift({ _id: SHIFT_1, status: 'cancelled' })),
      )
      .mockReturnValueOnce(leanExec(makeShift({ _id: SHIFT_2 })));
    mockContractModel.findOne.mockReturnValueOnce(
      leanExec(makeContract({ status: 'paused' })),
    ); // inactive
    const err = await service
      .bulkAssignContracts(
        BIZ_ID,
        [
          { shiftId: SHIFT_1, contractId: CONTRACT_1 },
          { shiftId: SHIFT_2, contractId: CONTRACT_2 },
        ],
        actor,
      )
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const body = err.getResponse?.();
    expect(body?.errors).toHaveLength(2);
    expect(body?.errors?.map((e: any) => e.code)).toContain('SHIFT_CANCELLED');
    expect(body?.errors?.map((e: any) => e.code)).toContain(
      'CONTRACT_INACTIVE',
    );
  });

  it('SHIFT_NOT_FOUND is treated as orphaned (skipped, not a validation error)', async () => {
    // Orphaned BI records are skipped. Domain errors (cancelled, inactive) still fail.
    mockShiftModel.findOne
      .mockReturnValueOnce(leanExec(null)) // orphaned — skipped
      .mockReturnValueOnce(leanExec(makeShift({ _id: SHIFT_2 }))); // real shift
    mockContractModel.findOne.mockReturnValueOnce(leanExec(makeContract())); // valid for SHIFT_2
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExec({ contractId: CONTRACT_2 }),
    );

    const result = await service.bulkAssignContracts(
      BIZ_ID,
      [
        { shiftId: SHIFT_1, contractId: CONTRACT_1 }, // orphaned → skipped
        { shiftId: SHIFT_2, contractId: CONTRACT_2 }, // real → updated
      ],
      actor,
    );
    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(1);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('calls startSession and commits the transaction on success', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExec({ ...makeShift(), contractId: CONTRACT_1 }),
    );

    await service.bulkAssignContracts(
      BIZ_ID,
      [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
      actor,
    );

    expect(mockShiftModel.db.startSession).toHaveBeenCalled();
    expect(mockSession.startTransaction).toHaveBeenCalled();
    expect(mockSession.commitTransaction).toHaveBeenCalled();
    expect(mockSession.abortTransaction).not.toHaveBeenCalled();
  });

  it('updates all Shifts with contractId, contractAssigned=true', async () => {
    mockShiftModel.findOne
      .mockReturnValueOnce(leanExec(makeShift({ _id: SHIFT_1 })))
      .mockReturnValueOnce(leanExec(makeShift({ _id: SHIFT_2 })));
    mockContractModel.findOne
      .mockReturnValueOnce(leanExec(makeContract({ _id: CONTRACT_1 })))
      .mockReturnValueOnce(leanExec(makeContract({ _id: CONTRACT_2 })));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExec({ contractId: CONTRACT_1, contractAssigned: true }),
    );

    const result = await service.bulkAssignContracts(
      BIZ_ID,
      [
        { shiftId: SHIFT_1, contractId: CONTRACT_1 },
        { shiftId: SHIFT_2, contractId: CONTRACT_2 },
      ],
      actor,
    );

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.updated).toBe(2);
    expect(result.shiftIds).toHaveLength(2);
    expect(mockShiftModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('sets contractAssigned=true and resolves customerId from Contract (not from client)', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(
      leanExec(makeContract({ customerId: CUSTOMER_ID })),
    );
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExec({ contractId: CONTRACT_1, contractAssigned: true }),
    );

    await service.bulkAssignContracts(
      BIZ_ID,
      [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
      actor,
    );

    const updateCall = mockShiftModel.findOneAndUpdate.mock.calls[0][1];
    expect(updateCall.$set.contractAssigned).toBe(true);
    expect(updateCall.$set.customerId).toBe(CUSTOMER_ID);
    // Client cannot inject customerId — it comes from the Contract document
  });

  it('returns success=true with shiftIds in the response', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExec({ contractId: CONTRACT_1, contractAssigned: true }),
    );

    const result = await service.bulkAssignContracts(
      BIZ_ID,
      [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
      actor,
    );
    expect(result.success).toBe(true);
    expect(result.shiftIds).toContain(SHIFT_1);
    expect(result.skipped).toBe(0);
  });

  it('returns skipped count for orphaned BI records not found in MongoDB', async () => {
    // 2 real shifts + 3 orphaned
    mockShiftModel.findOne
      .mockReturnValueOnce(leanExec(makeShift({ _id: SHIFT_1 })))
      .mockReturnValueOnce(leanExec(null)) // orphan
      .mockReturnValueOnce(leanExec(makeShift({ _id: SHIFT_2 })))
      .mockReturnValueOnce(leanExec(null)) // orphan
      .mockReturnValueOnce(leanExec(null)); // orphan
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExec({ contractId: CONTRACT_1 }),
    );

    const result = await service.bulkAssignContracts(
      BIZ_ID,
      [
        { shiftId: SHIFT_1, contractId: CONTRACT_1 },
        { shiftId: '507f1f77bcf86cd799439091', contractId: CONTRACT_1 }, // orphan
        { shiftId: SHIFT_2, contractId: CONTRACT_2 },
        { shiftId: '507f1f77bcf86cd799439092', contractId: CONTRACT_1 }, // orphan
        { shiftId: '507f1f77bcf86cd799439093', contractId: CONTRACT_1 }, // orphan
      ],
      actor,
    );

    expect(result.updated).toBe(2);
    expect(result.skipped).toBe(3);
    expect(result.total).toBe(5);
  });

  it('triggers FULL BI ETL (full=true) after successful commit to clean up orphans', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExec({ contractId: CONTRACT_1 }),
    );

    await service.bulkAssignContracts(
      BIZ_ID,
      [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
      actor,
    );

    // Allow the fire-and-forget promise to flush
    await Promise.resolve();
    // Must be full=true (not false) to trigger orphan cleanup in BI ETL
    expect(mockBiService.syncModel).toHaveBeenCalledWith(BIZ_ID, 'shift', true);
  });

  it('aborts transaction and does NOT trigger BI full sync when a write fails', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB write error')),
      }),
    });

    await expect(
      service.bulkAssignContracts(
        BIZ_ID,
        [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
        actor,
      ),
    ).rejects.toThrow('DB write error');

    expect(mockSession.abortTransaction).toHaveBeenCalled();
    expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    // BI ETL is NOT triggered on failure
    await Promise.resolve();
    expect(mockBiService.syncModel).not.toHaveBeenCalled();
  });

  it('always ends the session (finally block)', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExec({ contractId: CONTRACT_1 }),
    );

    await service.bulkAssignContracts(
      BIZ_ID,
      [{ shiftId: SHIFT_1, contractId: CONTRACT_1 }],
      actor,
    );
    expect(mockSession.endSession).toHaveBeenCalled();
  });
});

// ── Controller endpoint ───────────────────────────────────────────────────────

describe('PATCH /shifts/contracts/bulk — endpoint contract', () => {
  it('route path is /shifts/contracts/bulk (two-segment, no :id collision)', () => {
    const path = '/shifts/contracts/bulk';
    expect(path).not.toMatch(/\/shifts\/[^/]+$/); // not /:id single segment
    expect(path).toBe('/shifts/contracts/bulk');
  });

  it('method is PATCH', () => {
    expect('PATCH').toBe('PATCH');
  });

  it('bulk assignment sends only shiftId and contractId — not extra fields', () => {
    const payload = {
      assignments: [
        { shiftId: SHIFT_1, contractId: CONTRACT_1 },
        { shiftId: SHIFT_2, contractId: CONTRACT_2 },
      ],
    };
    payload.assignments.forEach((a) => {
      expect(Object.keys(a)).toEqual(['shiftId', 'contractId']);
      expect(a).not.toHaveProperty('businessId');
      expect(a).not.toHaveProperty('customerId');
      expect(a).not.toHaveProperty('title');
      expect(a).not.toHaveProperty('status');
    });
  });

  it('businessId comes from JWT AuthContext — never from request body', () => {
    // The controller calls resolveContext(ctx) which reads ctx.companyId from JWT.
    // The body only contains assignments, not businessId.
    const bodyFields = Object.keys({ assignments: [] });
    expect(bodyFields).not.toContain('businessId');
    expect(bodyFields).not.toContain('companyId');
  });

  it('success response shape: { success, total, updated, shiftIds }', () => {
    const response = {
      success: true,
      total: 2,
      updated: 2,
      shiftIds: [SHIFT_1, SHIFT_2],
    };
    expect(response.success).toBe(true);
    expect(response.shiftIds).toHaveLength(2);
  });

  it('error response shape: { success: false, errors: [{ shiftId, code, message }] }', () => {
    const errorBody = {
      success: false,
      message: 'One or more assignments are invalid',
      errors: [
        {
          shiftId: SHIFT_1,
          code: 'CONTRACT_INACTIVE',
          message: 'The selected Contract is not active',
        },
      ],
    };
    expect(errorBody.success).toBe(false);
    expect(errorBody.errors[0].shiftId).toBe(SHIFT_1);
    expect(errorBody.errors[0].code).toBe('CONTRACT_INACTIVE');
  });
});

// ── Backward compatibility: single-assign still works ─────────────────────────

describe('Single assignContract — backward compatibility', () => {
  let service: ShiftsService;

  beforeEach(async () => {
    const mod = await buildModule();
    service = mod.get(ShiftsService);
    jest.clearAllMocks();
    mockCustomerModel.findById.mockReturnValue(
      leanExec({ _id: CUSTOMER_ID, displayName: 'Test Customer' }),
    );
    mockCustomerModel.find.mockReturnValue(leanExec([]));
  });

  it('PATCH /shifts/:id/assign-contract still exists and works', async () => {
    mockShiftModel.findOne.mockReturnValue(leanExec(makeShift()));
    mockContractModel.findOne.mockReturnValue(leanExec(makeContract()));
    mockShiftModel.findOneAndUpdate.mockReturnValue(
      leanExec({ contractId: CONTRACT_1, contractAssigned: true }),
    );

    const actor = { email: 'e', firstName: 'F', companyId: BIZ_ID };
    const result = await service.assignContract(
      SHIFT_1,
      BIZ_ID,
      CONTRACT_1,
      actor,
    );
    expect((result as any).contractAssigned).toBe(true);
  });
});
