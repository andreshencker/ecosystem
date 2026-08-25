import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { ContractsService } from '../contracts.service';
import { Contract } from '../schemas/contract.schema';
import { Customer } from '../../customer/schemas/customer.schema';
import { Shift } from '../../shifts/schemas/shift.schema';
import { LinkedCalendar } from '../../linked-calendars/schemas/linked-calendar.schema';
import { RelayClientService } from '../../../integrations/relay/client/relay-client.service';
import { UsersService } from '../../users/users.service';
import { toContractResponse } from '../dto/contract-response.dto';
import type { CreateContractDto } from '../dto/create-contract.dto';
import type { UpdateContractDto } from '../dto/update-contract.dto';

// ─── Constants ────────────────────────────────────────────────────────────────

const HOLIDAY_CAL_ID = '6a58a9a43be409328fa6f4d1';
const PAYMENT_CAL_ID = '6a58a9a43be409328fa6f4d2';

const BIZ = 'biz_1';
const OTHER = 'biz_other';
const CUST = new Types.ObjectId().toHexString();
const VALID_CONTRACT_ID = new Types.ObjectId().toHexString();

const ACTOR = {
  email: 'admin@example.com',
  firstName: 'Admin',
  companyId: BIZ,
};

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockChain(value: any) {
  const q: any = {};
  q.sort = () => q;
  q.skip = () => q;
  q.limit = () => q;
  q.lean = () => q;
  q.select = () => q;
  q.exec = () => Promise.resolve(value);
  return q;
}

const mockComm = { notifyEvent: jest.fn().mockResolvedValue(true) };
const mockUsers = {
  getCompanyDisplayName: jest.fn().mockResolvedValue('Test Co'),
};

function buildContractModel(overrides: Partial<Record<string, any>> = {}) {
  return {
    create: jest.fn(),
    find: jest.fn(() => mockChain([])),
    findOne: jest.fn(() => mockChain(null)),
    findOneAndUpdate: jest.fn(() => mockChain(null)),
    findOneAndDelete: jest.fn(() => mockChain(null)),
    countDocuments: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function buildCustomerModel(overrides: Partial<Record<string, any>> = {}) {
  return {
    findOne: jest.fn(() => mockChain(null)),
    findById: jest.fn(() => mockChain(null)),
    find: jest.fn(() => mockChain([])), // batch name lookup in findAll
    ...overrides,
  };
}

function fakeCustomer(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(CUST),
    companyId: BIZ,
    displayName: 'Acme Ltd',
    ...overrides,
  };
}

function fakeContract(
  overrides: Record<string, any> = {},
): Record<string, any> {
  return {
    _id: new Types.ObjectId(VALID_CONTRACT_ID),
    businessId: BIZ,
    customerId: CUST,
    startDate: new Date('2024-01-01'),
    endDate: null,
    positionName: 'Senior Developer',
    workType: 'contractor',
    invoiceDescription: 'Software development services',
    status: 'active',
    billingCycle: 'per_shift',
    paymentTermsDays: 14,
    scheduledPaymentEnabled: false,
    scheduledPaymentDay: null,
    rateType: 'fixed',
    minimumHours: 4,
    defaultBreakMinutes: 30,
    rates: [{ days: ['all'], startTime: null, endTime: null, hourlyRate: 95 }],
    notes: null,
    useInvoicePrefix: false,
    invoicePrefix: null,
    startingInvoiceNumber: 1,
    currency: 'AUD',
    chargeGst: false,
    gstRate: null,
    holidayRules: {
      enabled: false,
      calendarId: null,
      calendarName: null,
      calendarProviderName: null,
      behaviour: 'normal_rate',
      multiplier: null,
      fixedHourlyRate: null,
    },
    superannuationRules: {
      enabled: false,
      rate: null,
      paymentFrequency: null,
    },
    paymentCalendarEnabled: false,
    paymentCalendarSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function baseCreateDto(
  overrides: Partial<CreateContractDto> = {},
): CreateContractDto {
  return {
    customerId: CUST,
    startDate: '2024-01-01',
    positionName: 'Senior Developer',
    workType: 'contractor',
    invoiceDescription: 'Software development services',
    billingCycle: 'per_shift',
    paymentTermsDays: 14,
    rateType: 'fixed',
    rates: [{ days: ['all'], hourlyRate: 95 }],
    ...overrides,
  };
}

// ─── Build helper ─────────────────────────────────────────────────────────────

function buildCalendarModel(overrides: Partial<Record<string, any>> = {}) {
  return {
    findOne: jest.fn(() => mockChain(null)),
    ...overrides,
  };
}

function buildShiftModel(overrides: Partial<Record<string, any>> = {}) {
  return {
    // Default: no shifts reference this contract
    exists: jest.fn(() => mockChain(null)),
    ...overrides,
  };
}

async function build(
  contractOverrides: Partial<Record<string, any>> = {},
  customerOverrides: Partial<Record<string, any>> = {},
  calendarOverrides: Partial<Record<string, any>> = {},
  shiftOverrides: Partial<Record<string, any>> = {},
) {
  const contractModel = buildContractModel(contractOverrides);
  const customerModel = buildCustomerModel(customerOverrides);
  const calendarModel = buildCalendarModel(calendarOverrides);
  const shiftModel = buildShiftModel(shiftOverrides);

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ContractsService,
      { provide: getModelToken(Contract.name), useValue: contractModel },
      { provide: getModelToken(Customer.name), useValue: customerModel },
      { provide: getModelToken(LinkedCalendar.name), useValue: calendarModel },
      { provide: getModelToken(Shift.name), useValue: shiftModel },
      { provide: RelayClientService, useValue: mockComm },
      { provide: UsersService, useValue: mockUsers },
    ],
  }).compile();

  const service = module.get<ContractsService>(ContractsService);
  return { service, contractModel, customerModel, calendarModel, shiftModel };
}

// ─── toContractResponse mapper ────────────────────────────────────────────────

describe('toContractResponse', () => {
  it('maps workType field', () => {
    const doc = fakeContract({ workType: 'casual' });
    const res = toContractResponse(doc as any);
    expect(res.workType).toBe('casual');
  });

  it('defaults workType to "contractor" for legacy documents without the field', () => {
    const doc = fakeContract();
    delete (doc as any).workType;
    const res = toContractResponse(doc as any);
    expect(res.workType).toBe('contractor');
  });

  it('maps endDate as null for open-ended contracts', () => {
    const doc = fakeContract({ endDate: null });
    const res = toContractResponse(doc as any);
    expect(res.endDate).toBeNull();
  });

  it('maps endDate as ISO string when present', () => {
    const d = new Date('2026-12-31');
    const doc = fakeContract({ endDate: d });
    const res = toContractResponse(doc as any);
    expect(res.endDate).toBe(d.toISOString());
  });

  it('maps all six work types correctly', () => {
    const types = [
      'casual',
      'contractor',
      'subcontractor',
      'service_agreement',
      'project_based',
      'other',
    ];
    for (const workType of types) {
      const res = toContractResponse(fakeContract({ workType }) as any);
      expect(res.workType).toBe(workType);
    }
  });
});

// ─── toContractResponse — holiday rules mapping ───────────────────────────────

describe('toContractResponse — holiday rules (behaviour model)', () => {
  it('returns safe defaults when holidayRules is absent', () => {
    const doc = fakeContract();
    delete (doc as any).holidayRules;
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.enabled).toBe(false);
    expect(res.holidayRules.calendarId).toBeNull();
    expect(res.holidayRules.behaviour).toBe('normal_rate');
    expect(res.holidayRules.multiplier).toBeNull();
    expect(res.holidayRules.fixedHourlyRate).toBeNull();
  });

  it('maps new-format disabled holiday rules', () => {
    const doc = fakeContract({
      holidayRules: {
        enabled: false,
        calendarId: null,
        calendarName: null,
        calendarProviderName: null,
        behaviour: 'normal_rate',
        multiplier: null,
        fixedHourlyRate: null,
      },
    });
    expect(toContractResponse(doc as any).holidayRules.enabled).toBe(false);
  });

  it('maps new-format enabled multiplier rules', () => {
    const doc = fakeContract({
      holidayRules: {
        enabled: true,
        calendarId: 'cal1',
        calendarName: 'AU Holidays',
        calendarProviderName: 'iCloud',
        behaviour: 'multiplier',
        multiplier: 2.5,
        fixedHourlyRate: null,
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.enabled).toBe(true);
    expect(res.holidayRules.behaviour).toBe('multiplier');
    expect(res.holidayRules.multiplier).toBe(2.5);
    expect(res.holidayRules.fixedHourlyRate).toBeNull();
  });

  it('maps new-format enabled fixed_rate rules', () => {
    const doc = fakeContract({
      holidayRules: {
        enabled: true,
        calendarId: 'cal1',
        calendarName: 'VIC Holidays',
        calendarProviderName: 'Google',
        behaviour: 'fixed_rate',
        multiplier: null,
        fixedHourlyRate: 80,
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.behaviour).toBe('fixed_rate');
    expect(res.holidayRules.fixedHourlyRate).toBe(80);
    expect(res.holidayRules.multiplier).toBeNull();
  });

  it('maps new-format no_work', () => {
    const doc = fakeContract({
      holidayRules: {
        enabled: true,
        calendarId: 'cal1',
        calendarName: 'NSW',
        calendarProviderName: 'iCloud',
        behaviour: 'no_work',
        multiplier: null,
        fixedHourlyRate: null,
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.enabled).toBe(true);
    expect(res.holidayRules.behaviour).toBe('no_work');
  });

  // Format 2 (previous session) — workAllowed + payMethod → behaviour
  it('maps Format 2 workAllowed=false + payMethod=null → behaviour=no_work', () => {
    const doc = fakeContract({
      holidayRules: {
        enabled: true,
        calendarId: 'cal1',
        calendarName: 'NSW',
        calendarProviderName: 'iCloud',
        workAllowed: false,
        payMethod: null,
        multiplier: null,
        fixedHourlyRate: null,
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.behaviour).toBe('no_work');
  });

  it('maps Format 2 workAllowed=true + payMethod=multiplier → behaviour=multiplier', () => {
    const doc = fakeContract({
      holidayRules: {
        enabled: true,
        calendarId: 'cal1',
        calendarName: 'AU Holidays',
        calendarProviderName: 'iCloud',
        workAllowed: true,
        payMethod: 'multiplier',
        multiplier: 2.0,
        fixedHourlyRate: null,
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.behaviour).toBe('multiplier');
    expect(res.holidayRules.multiplier).toBe(2.0);
  });

  it('maps Format 2 workAllowed=true + payMethod=fixed_rate → behaviour=fixed_rate', () => {
    const doc = fakeContract({
      holidayRules: {
        enabled: true,
        calendarId: 'cal1',
        calendarName: 'AU Holidays',
        calendarProviderName: 'Google',
        workAllowed: true,
        payMethod: 'fixed_rate',
        multiplier: null,
        fixedHourlyRate: 80,
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.behaviour).toBe('fixed_rate');
    expect(res.holidayRules.fixedHourlyRate).toBe(80);
  });

  // Format 1 (original legacy) — behaviour without enabled
  it('maps Format 1 (original legacy): behaviour=no_work without enabled field', () => {
    const doc = fakeContract({
      holidayRules: {
        behaviour: 'no_work',
        calendarId: 'cal1',
        calendarName: 'AU Holidays',
        multiplier: null,
        fixedHourlyRate: null,
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.enabled).toBe(true); // inferred from calendarId
    expect(res.holidayRules.behaviour).toBe('no_work');
  });

  it('maps Format 1: behaviour=multiplier with calendar → enabled=true', () => {
    const doc = fakeContract({
      holidayRules: {
        behaviour: 'multiplier',
        calendarId: 'cal1',
        calendarName: 'AU Holidays',
        multiplier: 2.0,
        fixedHourlyRate: null,
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.enabled).toBe(true);
    expect(res.holidayRules.behaviour).toBe('multiplier');
    expect(res.holidayRules.multiplier).toBe(2.0);
  });

  it('maps Format 1: behaviour=normal_rate with no calendar → enabled=false', () => {
    const doc = fakeContract({
      holidayRules: {
        behaviour: 'normal_rate',
        calendarId: null,
        multiplier: null,
        fixedHourlyRate: null,
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.holidayRules.enabled).toBe(false);
    expect(res.holidayRules.behaviour).toBe('normal_rate');
  });
});

// ─── ContractsService.create ──────────────────────────────────────────────────

describe('ContractsService — create', () => {
  it('creates a contract and persists workType', async () => {
    const created = fakeContract({ workType: 'casual' });
    const { service, contractModel, customerModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );

    const dto = baseCreateDto({ workType: 'casual' });
    const result = await service.create(BIZ, dto, ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ workType: 'casual' }),
    );
    expect((result as any).workType).toBe('casual');
  });

  it('defaults workType to "contractor" when not supplied', async () => {
    const created = fakeContract({ workType: 'contractor' });
    const { service, contractModel, customerModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );

    const dto = baseCreateDto();
    delete (dto as any).workType;
    await service.create(BIZ, dto, ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ workType: 'contractor' }),
    );
  });

  it('creates an open-ended contract with endDate null', async () => {
    const created = fakeContract({ endDate: null });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );

    const dto = baseCreateDto();
    await service.create(BIZ, dto, ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ endDate: null }),
    );
  });

  it('creates a contract with endDate when supplied', async () => {
    const end = new Date('2026-12-31');
    const created = fakeContract({ endDate: end });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );

    const dto = baseCreateDto({ endDate: '2026-12-31' });
    await service.create(BIZ, dto, ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ endDate: new Date('2026-12-31') }),
    );
  });

  it('rejects endDate before startDate', async () => {
    const { service } = await build(
      {},
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    const dto = baseCreateDto({
      startDate: '2026-06-01',
      endDate: '2026-01-01',
    });
    await expect(service.create(BIZ, dto, ACTOR)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('allows endDate equal to startDate', async () => {
    const created = fakeContract({
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-01'),
    });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    const dto = baseCreateDto({
      startDate: '2026-06-01',
      endDate: '2026-06-01',
    });
    await expect(service.create(BIZ, dto, ACTOR)).resolves.toBeDefined();
  });

  it('rejects unknown customer', async () => {
    const { service } = await build(
      {},
      { findOne: jest.fn(() => mockChain(null)) },
    );
    await expect(service.create(BIZ, baseCreateDto(), ACTOR)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('creates contract with holiday rules — multiplier', async () => {
    const created = fakeContract({
      holidayRules: {
        enabled: true,
        calendarId: HOLIDAY_CAL_ID,
        calendarName: 'AU Holidays',
        calendarProviderName: 'iCloud',
        behaviour: 'multiplier',
        multiplier: 2.0,
        fixedHourlyRate: null,
      },
    });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
      {
        findOne: jest.fn(() =>
          mockChain({
            _id: HOLIDAY_CAL_ID,
            flow: 'holidays',
            status: 'active',
          }),
        ),
      },
    );
    const dto = baseCreateDto({
      holidayRules: {
        enabled: true,
        calendarId: HOLIDAY_CAL_ID,
        behaviour: 'multiplier',
        multiplier: 2.0,
      },
    });
    await service.create(BIZ, dto, ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        holidayRules: expect.objectContaining({
          enabled: true,
          behaviour: 'multiplier',
          multiplier: 2.0,
        }),
      }),
    );
  });

  it('creates contract with holiday rules — disabled', async () => {
    const created = fakeContract();
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    const dto = baseCreateDto({
      holidayRules: { enabled: false },
    });
    await service.create(BIZ, dto, ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        holidayRules: expect.objectContaining({ enabled: false }),
      }),
    );
  });

  it('applies status=active on creation', async () => {
    const created = fakeContract({ status: 'active' });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(BIZ, baseCreateDto(), ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
  });

  it('never applies status=draft on creation', async () => {
    const created = fakeContract({ status: 'active' });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(BIZ, baseCreateDto(), ACTOR);
    const callArg = contractModel.create.mock.calls[0][0];
    expect(callArg.status).not.toBe('draft');
  });
});

// ─── ContractsService.update ──────────────────────────────────────────────────

describe('ContractsService — update', () => {
  it('updates workType', async () => {
    const existing = fakeContract({ workType: 'contractor' });
    const updated = fakeContract({ workType: 'casual' });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });

    const dto: UpdateContractDto = { workType: 'casual' };
    const result = await service.update(VALID_CONTRACT_ID, BIZ, dto, ACTOR);
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ workType: 'casual' }),
      }),
      expect.anything(),
    );
    expect((result as any).workType).toBe('casual');
  });

  it('clears endDate when null is supplied (open-ended transition)', async () => {
    const existing = fakeContract({ endDate: new Date('2026-12-31') });
    const updated = fakeContract({ endDate: null });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });

    const dto: UpdateContractDto = { endDate: null };
    await service.update(VALID_CONTRACT_ID, BIZ, dto, ACTOR);
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ endDate: null }),
      }),
      expect.anything(),
    );
  });

  it('updates holidayRules with fixed_rate', async () => {
    const existing = fakeContract();
    const updated = fakeContract({
      holidayRules: {
        enabled: true,
        calendarId: HOLIDAY_CAL_ID,
        behaviour: 'fixed_rate',
        multiplier: null,
        fixedHourlyRate: 80,
      },
    });
    const { service, contractModel } = await build(
      {
        findOne: jest.fn(() => mockChain(existing)),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      },
      {},
      {
        findOne: jest.fn(() =>
          mockChain({
            _id: HOLIDAY_CAL_ID,
            flow: 'holidays',
            status: 'active',
          }),
        ),
      },
    );

    const dto: UpdateContractDto = {
      holidayRules: {
        enabled: true,
        calendarId: HOLIDAY_CAL_ID,
        behaviour: 'fixed_rate',
        fixedHourlyRate: 80,
      },
    };
    await service.update(VALID_CONTRACT_ID, BIZ, dto, ACTOR);
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          holidayRules: expect.objectContaining({
            behaviour: 'fixed_rate',
            fixedHourlyRate: 80,
          }),
        }),
      }),
      expect.anything(),
    );
  });

  it('rejects update on finished contract', async () => {
    const existing = fakeContract({ status: 'finished' });
    const { service } = await build({
      findOne: jest.fn(() => mockChain(existing)),
    });
    await expect(
      service.update(
        VALID_CONTRACT_ID,
        BIZ,
        { positionName: 'New Name' },
        ACTOR,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException for unknown contract', async () => {
    const { service } = await build({
      findOne: jest.fn(() => mockChain(null)),
    });
    await expect(
      service.update(
        VALID_CONTRACT_ID,
        BIZ,
        { positionName: 'New Name' },
        ACTOR,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── ContractsService — date validation ──────────────────────────────────────

describe('ContractsService — date validation', () => {
  it('allows endDate equal to startDate', async () => {
    const created = fakeContract({
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-01'),
    });
    const { service } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    const dto = baseCreateDto({
      startDate: '2026-06-01',
      endDate: '2026-06-01',
    });
    await expect(service.create(BIZ, dto, ACTOR)).resolves.toBeDefined();
  });

  it('rejects endDate strictly before startDate', async () => {
    const { service } = await build(
      {},
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    const dto = baseCreateDto({
      startDate: '2026-06-15',
      endDate: '2026-06-14',
    });
    await expect(service.create(BIZ, dto, ACTOR)).rejects.toThrow(
      BadRequestException,
    );
  });
});

// ─── ContractsService — status transitions ────────────────────────────────────

describe('ContractsService — status transitions', () => {
  it('activates a draft contract', async () => {
    const existing = fakeContract({ status: 'draft' });
    const updated = fakeContract({ status: 'active' });
    const { service } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    const result = await service.activate(VALID_CONTRACT_ID, BIZ, ACTOR);
    expect((result as any).status).toBe('active');
  });

  it('blocks activation of an already-active contract', async () => {
    const existing = fakeContract({ status: 'active' });
    const { service } = await build({
      findOne: jest.fn(() => mockChain(existing)),
    });
    await expect(
      service.activate(VALID_CONTRACT_ID, BIZ, ACTOR),
    ).rejects.toThrow(BadRequestException);
  });

  it('cancels an active contract', async () => {
    const existing = fakeContract({ status: 'active' });
    const updated = fakeContract({ status: 'cancelled' });
    const { service } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    const result = await service.cancel(VALID_CONTRACT_ID, BIZ, ACTOR);
    expect((result as any).status).toBe('cancelled');
  });

  it('finishes an active contract', async () => {
    const existing = fakeContract({ status: 'active' });
    const updated = fakeContract({ status: 'finished' });
    const { service } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    const result = await service.finish(VALID_CONTRACT_ID, BIZ, ACTOR);
    expect((result as any).status).toBe('finished');
  });

  it('blocks deletion when contract has associated shifts', async () => {
    const existing = fakeContract({ status: 'active' });
    const { service } = await build(
      { findOne: jest.fn(() => mockChain(existing)) },
      {},
      {},
      // shiftModel.exists returns a truthy document → shifts exist
      { exists: jest.fn(() => mockChain({ _id: 'shift-001' })) },
    );
    await expect(service.remove(VALID_CONTRACT_ID, BIZ)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('allows deletion when contract has no associated shifts', async () => {
    const existing = fakeContract({ status: 'active' });
    const { service, contractModel } = await build(
      {
        findOne: jest.fn(() => mockChain(existing)),
        findOneAndDelete: jest.fn(() => mockChain(existing)),
      },
      {},
      {},
      // shiftModel.exists returns null → no shifts
      { exists: jest.fn(() => mockChain(null)) },
    );
    await expect(
      service.remove(VALID_CONTRACT_ID, BIZ),
    ).resolves.toBeUndefined();
    expect(contractModel.findOneAndDelete).toHaveBeenCalledWith({
      _id: VALID_CONTRACT_ID,
      businessId: BIZ,
    });
  });

  it('delete error message is user-friendly (no technical jargon)', async () => {
    const existing = fakeContract({ status: 'active' });
    const { service } = await build(
      { findOne: jest.fn(() => mockChain(existing)) },
      {},
      {},
      { exists: jest.fn(() => mockChain({ _id: 'shift-001' })) },
    );
    let caught: any;
    try {
      await service.remove(VALID_CONTRACT_ID, BIZ);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(BadRequestException);
    expect(caught.message).toContain('cannot be deleted');
  });
});

// ─── ContractsService — findAll / findById ────────────────────────────────────

describe('ContractsService — queries', () => {
  it('findAll applies businessId filter', async () => {
    const { service, contractModel } = await build({
      find: jest.fn(() => mockChain([fakeContract()])),
      countDocuments: jest.fn().mockResolvedValue(1),
    });
    const result = await service.findAll(BIZ, { page: 1, limit: 20 });
    expect(contractModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: BIZ }),
    );
    expect(result.total).toBe(1);
  });

  it('findAll populates customerName from the customer collection', async () => {
    const contract = fakeContract({ customerId: CUST });
    const { service } = await build(
      {
        find: jest.fn(() => mockChain([contract])),
        countDocuments: jest.fn().mockResolvedValue(1),
      },
      // customerModel.find returns the customer with a displayName
      {
        find: jest.fn(() =>
          mockChain([{ _id: CUST, displayName: 'Acme Ltd' }]),
        ),
      },
    );
    const result = await service.findAll(BIZ, { page: 1, limit: 20 });
    expect((result.items[0] as any).customerName).toBe('Acme Ltd');
  });

  it('findAll sets customerName to null when customer not found', async () => {
    const contract = fakeContract({ customerId: CUST });
    const { service } = await build(
      {
        find: jest.fn(() => mockChain([contract])),
        countDocuments: jest.fn().mockResolvedValue(1),
      },
      // customerModel.find returns empty
      { find: jest.fn(() => mockChain([])) },
    );
    const result = await service.findAll(BIZ, { page: 1, limit: 20 });
    expect((result.items[0] as any).customerName).toBeNull();
  });

  it('findById returns null for invalid ObjectId', async () => {
    const { service } = await build();
    const result = await service.findById('not-an-id', BIZ);
    expect(result).toBeNull();
  });

  it('findByIdOrThrow throws NotFoundException when contract not found', async () => {
    const { service } = await build({
      findOne: jest.fn(() => mockChain(null)),
    });
    await expect(
      service.findByIdOrThrow(VALID_CONTRACT_ID, BIZ),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── Schema defaults — WorkType backward compatibility ────────────────────────

describe('Schema backward compatibility', () => {
  it('toContractResponse defaults workType to "contractor" for legacy documents', () => {
    const doc = fakeContract();
    delete (doc as any).workType;
    const res = toContractResponse(doc as any);
    expect(res.workType).toBe('contractor');
  });

  it('toContractResponse defaults minimumHours to 4 when absent', () => {
    const doc = fakeContract();
    delete (doc as any).minimumHours;
    const res = toContractResponse(doc as any);
    expect(res.minimumHours).toBe(4);
  });

  it('toContractResponse defaults defaultBreakMinutes to 30 when absent', () => {
    const doc = fakeContract();
    delete (doc as any).defaultBreakMinutes;
    const res = toContractResponse(doc as any);
    expect(res.defaultBreakMinutes).toBe(30);
  });

  it('toContractResponse defaults invoicePrefix to null when absent (backward compat)', () => {
    const doc = fakeContract();
    delete (doc as any).invoicePrefix;
    const res = toContractResponse(doc as any);
    expect(res.invoicePrefix).toBeNull();
  });

  it('toContractResponse defaults startingInvoiceNumber to 1 when absent', () => {
    const doc = fakeContract();
    delete (doc as any).startingInvoiceNumber;
    const res = toContractResponse(doc as any);
    expect(res.startingInvoiceNumber).toBe(1);
  });

  it('toContractResponse maps notes as null when absent', () => {
    const doc = fakeContract({ notes: null });
    const res = toContractResponse(doc as any);
    expect(res.notes).toBeNull();
  });

  it('toContractResponse defaults useInvoicePrefix to false when absent', () => {
    const doc = fakeContract();
    delete (doc as any).useInvoicePrefix;
    const res = toContractResponse(doc as any);
    expect(res.useInvoicePrefix).toBe(false);
  });

  it('toContractResponse infers useInvoicePrefix=true from non-empty legacy invoicePrefix', () => {
    const doc = fakeContract();
    delete (doc as any).useInvoicePrefix;
    (doc as any).invoicePrefix = 'INV-';
    const res = toContractResponse(doc as any);
    expect(res.useInvoicePrefix).toBe(true);
    expect(res.invoicePrefix).toBe('INV-');
  });

  it('toContractResponse defaults currency to AUD when absent', () => {
    const doc = fakeContract();
    delete (doc as any).currency;
    const res = toContractResponse(doc as any);
    expect(res.currency).toBe('AUD');
  });

  it('toContractResponse maps currency', () => {
    const doc = fakeContract({ currency: 'GBP' });
    const res = toContractResponse(doc as any);
    expect(res.currency).toBe('GBP');
  });

  it('toContractResponse defaults chargeGst to false when absent', () => {
    const doc = fakeContract();
    delete (doc as any).chargeGst;
    const res = toContractResponse(doc as any);
    expect(res.chargeGst).toBe(false);
  });

  it('toContractResponse maps chargeGst=true', () => {
    const doc = fakeContract({ chargeGst: true });
    const res = toContractResponse(doc as any);
    expect(res.chargeGst).toBe(true);
  });
});

// ─── Invoice Settings — create and update ─────────────────────────────────────

describe('Invoice Settings — create', () => {
  it('creates with useInvoicePrefix=true and prefix', async () => {
    const created = fakeContract({
      useInvoicePrefix: true,
      invoicePrefix: 'PROJ-',
    });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({ useInvoicePrefix: true, invoicePrefix: 'PROJ-' }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        useInvoicePrefix: true,
        invoicePrefix: 'PROJ-',
      }),
    );
  });

  it('creates with useInvoicePrefix=false → invoicePrefix stored as null', async () => {
    const created = fakeContract({
      useInvoicePrefix: false,
      invoicePrefix: null,
    });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({ useInvoicePrefix: false }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ useInvoicePrefix: false, invoicePrefix: null }),
    );
  });

  it('creates with currency=USD', async () => {
    const created = fakeContract({ currency: 'USD' });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(BIZ, baseCreateDto({ currency: 'USD' }), ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'USD' }),
    );
  });

  it('creates with chargeGst=true', async () => {
    const created = fakeContract({ chargeGst: true });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(BIZ, baseCreateDto({ chargeGst: true }), ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ chargeGst: true }),
    );
  });

  it('defaults currency to AUD when omitted', async () => {
    const created = fakeContract({ currency: 'AUD' });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    const dto = baseCreateDto();
    delete (dto as any).currency;
    await service.create(BIZ, dto, ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'AUD' }),
    );
  });

  it('defaults chargeGst to false when omitted', async () => {
    const created = fakeContract({ chargeGst: false });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    const dto = baseCreateDto();
    delete (dto as any).chargeGst;
    await service.create(BIZ, dto, ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ chargeGst: false }),
    );
  });
});

describe('Invoice Settings — update', () => {
  it('updates currency', async () => {
    const existing = fakeContract({ currency: 'AUD' });
    const updated = fakeContract({ currency: 'GBP' });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    await service.update(VALID_CONTRACT_ID, BIZ, { currency: 'GBP' }, ACTOR);
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ currency: 'GBP' }),
      }),
      expect.anything(),
    );
  });

  it('updates chargeGst', async () => {
    const existing = fakeContract({ chargeGst: false });
    const updated = fakeContract({ chargeGst: true });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    await service.update(VALID_CONTRACT_ID, BIZ, { chargeGst: true }, ACTOR);
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ chargeGst: true }),
      }),
      expect.anything(),
    );
  });

  it('disabling prefix clears it to null', async () => {
    const existing = fakeContract({
      useInvoicePrefix: true,
      invoicePrefix: 'INV-',
    });
    const updated = fakeContract({
      useInvoicePrefix: false,
      invoicePrefix: null,
    });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    await service.update(
      VALID_CONTRACT_ID,
      BIZ,
      { useInvoicePrefix: false, invoicePrefix: null },
      ACTOR,
    );
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          useInvoicePrefix: false,
          invoicePrefix: null,
        }),
      }),
      expect.anything(),
    );
  });
});

// ─── GST Rate ────────────────────────────────────────────────────────────────

describe('GST Rate — toContractResponse', () => {
  it('returns gstRate when chargeGst=true', () => {
    const doc = fakeContract({ chargeGst: true, gstRate: 10 });
    const res = toContractResponse(doc as any);
    expect(res.chargeGst).toBe(true);
    expect(res.gstRate).toBe(10);
  });

  it('returns gstRate=null when chargeGst=false', () => {
    const doc = fakeContract({ chargeGst: false, gstRate: 10 });
    const res = toContractResponse(doc as any);
    expect(res.chargeGst).toBe(false);
    expect(res.gstRate).toBeNull();
  });

  it('defaults gstRate to null when absent', () => {
    const doc = fakeContract({ chargeGst: false });
    delete (doc as any).gstRate;
    const res = toContractResponse(doc as any);
    expect(res.gstRate).toBeNull();
  });
});

describe('GST Rate — create', () => {
  it('stores gstRate when chargeGst=true', async () => {
    const created = fakeContract({ chargeGst: true, gstRate: 10 });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({ chargeGst: true, gstRate: 10 }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ chargeGst: true, gstRate: 10 }),
    );
  });

  it('stores gstRate=null when chargeGst=false', async () => {
    const created = fakeContract({ chargeGst: false, gstRate: null });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({ chargeGst: false, gstRate: 10 }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ chargeGst: false, gstRate: null }),
    );
  });
});

// ─── Superannuation ───────────────────────────────────────────────────────────

describe('Superannuation — toContractResponse', () => {
  it('returns disabled defaults when superannuationRules is absent', () => {
    const doc = fakeContract();
    delete (doc as any).superannuationRules;
    const res = toContractResponse(doc as any);
    expect(res.superannuationRules.enabled).toBe(false);
    expect(res.superannuationRules.rate).toBeNull();
    expect(res.superannuationRules.paymentFrequency).toBeNull();
  });

  it('maps enabled superannuation with rate and frequency', () => {
    const doc = fakeContract({
      superannuationRules: {
        enabled: true,
        rate: 12,
        paymentFrequency: 'quarterly',
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.superannuationRules.enabled).toBe(true);
    expect(res.superannuationRules.rate).toBe(12);
    expect(res.superannuationRules.paymentFrequency).toBe('quarterly');
  });

  it('returns null rate/frequency when disabled even if values present', () => {
    const doc = fakeContract({
      superannuationRules: {
        enabled: false,
        rate: 12,
        paymentFrequency: 'quarterly',
      },
    });
    const res = toContractResponse(doc as any);
    expect(res.superannuationRules.enabled).toBe(false);
    expect(res.superannuationRules.rate).toBeNull();
    expect(res.superannuationRules.paymentFrequency).toBeNull();
  });
});

describe('Superannuation — create', () => {
  it('creates with superannuationRules enabled', async () => {
    const created = fakeContract({
      superannuationRules: {
        enabled: true,
        rate: 12,
        paymentFrequency: 'quarterly',
      },
    });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({
        superannuationRules: {
          enabled: true,
          rate: 12,
          paymentFrequency: 'quarterly',
        },
      }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        superannuationRules: expect.objectContaining({
          enabled: true,
          rate: 12,
          paymentFrequency: 'quarterly',
        }),
      }),
    );
  });

  it('creates with superannuationRules disabled — clears rate and frequency', async () => {
    const created = fakeContract();
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({
        superannuationRules: {
          enabled: false,
          rate: 12,
          paymentFrequency: 'monthly',
        },
      }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        superannuationRules: expect.objectContaining({
          enabled: false,
          rate: null,
          paymentFrequency: null,
        }),
      }),
    );
  });
});

describe('Superannuation — update', () => {
  it('updates superannuationRules', async () => {
    const existing = fakeContract();
    const updated = fakeContract({
      superannuationRules: {
        enabled: true,
        rate: 11.5,
        paymentFrequency: 'monthly',
      },
    });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    await service.update(
      VALID_CONTRACT_ID,
      BIZ,
      {
        superannuationRules: {
          enabled: true,
          rate: 11.5,
          paymentFrequency: 'monthly',
        },
      },
      ACTOR,
    );
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          superannuationRules: expect.objectContaining({
            enabled: true,
            rate: 11.5,
            paymentFrequency: 'monthly',
          }),
        }),
      }),
      expect.anything(),
    );
  });
});

// ─── Scheduled Payment ───────────────────────────────────────────────────────

describe('Scheduled Payment — toContractResponse', () => {
  it('defaults scheduledPaymentEnabled to false when absent', () => {
    const doc = fakeContract();
    delete (doc as any).scheduledPaymentEnabled;
    const res = toContractResponse(doc as any);
    expect(res.scheduledPaymentEnabled).toBe(false);
    expect(res.scheduledPaymentDay).toBeNull();
  });

  it('maps enabled scheduled payment with a day', () => {
    const doc = fakeContract({
      scheduledPaymentEnabled: true,
      scheduledPaymentDay: 'friday',
    });
    const res = toContractResponse(doc as any);
    expect(res.scheduledPaymentEnabled).toBe(true);
    expect(res.scheduledPaymentDay).toBe('friday');
  });

  it('returns null day when disabled even if a day is stored', () => {
    const doc = fakeContract({
      scheduledPaymentEnabled: false,
      scheduledPaymentDay: 'friday',
    });
    const res = toContractResponse(doc as any);
    expect(res.scheduledPaymentEnabled).toBe(false);
    expect(res.scheduledPaymentDay).toBeNull();
  });

  it('maps all valid weekday values', () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    for (const day of days) {
      const res = toContractResponse(
        fakeContract({
          scheduledPaymentEnabled: true,
          scheduledPaymentDay: day,
        }) as any,
      );
      expect(res.scheduledPaymentDay).toBe(day);
    }
  });
});

describe('Scheduled Payment — create', () => {
  it('creates with scheduledPaymentEnabled=false and null day by default', async () => {
    const created = fakeContract();
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(BIZ, baseCreateDto(), ACTOR);
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledPaymentEnabled: false,
        scheduledPaymentDay: null,
      }),
    );
  });

  it('creates with scheduledPaymentEnabled=true and a day', async () => {
    const created = fakeContract({
      scheduledPaymentEnabled: true,
      scheduledPaymentDay: 'friday',
    });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({
        scheduledPaymentEnabled: true,
        scheduledPaymentDay: 'friday',
      }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledPaymentEnabled: true,
        scheduledPaymentDay: 'friday',
      }),
    );
  });

  it('clears day when scheduledPaymentEnabled=false even if a day is provided', async () => {
    const created = fakeContract({
      scheduledPaymentEnabled: false,
      scheduledPaymentDay: null,
    });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({
        scheduledPaymentEnabled: false,
        scheduledPaymentDay: 'friday',
      }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledPaymentEnabled: false,
        scheduledPaymentDay: null,
      }),
    );
  });
});

describe('Scheduled Payment — update', () => {
  it('enables scheduled payment and sets a day', async () => {
    const existing = fakeContract();
    const updated = fakeContract({
      scheduledPaymentEnabled: true,
      scheduledPaymentDay: 'tuesday',
    });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    await service.update(
      VALID_CONTRACT_ID,
      BIZ,
      {
        scheduledPaymentEnabled: true,
        scheduledPaymentDay: 'tuesday',
      },
      ACTOR,
    );
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          scheduledPaymentEnabled: true,
          scheduledPaymentDay: 'tuesday',
        }),
      }),
      expect.anything(),
    );
  });

  it('disabling clears the stored day', async () => {
    const existing = fakeContract({
      scheduledPaymentEnabled: true,
      scheduledPaymentDay: 'friday',
    });
    const updated = fakeContract({
      scheduledPaymentEnabled: false,
      scheduledPaymentDay: null,
    });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    await service.update(
      VALID_CONTRACT_ID,
      BIZ,
      {
        scheduledPaymentEnabled: false,
        scheduledPaymentDay: null,
      },
      ACTOR,
    );
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          scheduledPaymentEnabled: false,
          scheduledPaymentDay: null,
        }),
      }),
      expect.anything(),
    );
  });
});

// ─── Payment Mode mutual exclusion ───────────────────────────────────────────

describe('Payment Mode — mutual exclusion', () => {
  it('toContractResponse: paymentTermsDays=14 when scheduled=false', () => {
    const doc = fakeContract({
      scheduledPaymentEnabled: false,
      paymentTermsDays: 14,
      scheduledPaymentDay: null,
    });
    const res = toContractResponse(doc as any);
    expect(res.paymentTermsDays).toBe(14);
    expect(res.scheduledPaymentDay).toBeNull();
  });

  it('toContractResponse: paymentTermsDays=null when scheduled=true', () => {
    const doc = fakeContract({
      scheduledPaymentEnabled: true,
      paymentTermsDays: null,
      scheduledPaymentDay: 'friday',
    });
    const res = toContractResponse(doc as any);
    expect(res.paymentTermsDays).toBeNull();
    expect(res.scheduledPaymentDay).toBe('friday');
  });

  it('create: schedEnabled=false stores paymentTermsDays and clears day', async () => {
    const created = fakeContract({
      scheduledPaymentEnabled: false,
      paymentTermsDays: 30,
      scheduledPaymentDay: null,
    });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({ scheduledPaymentEnabled: false, paymentTermsDays: 30 }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledPaymentEnabled: false,
        paymentTermsDays: 30,
        scheduledPaymentDay: null,
      }),
    );
  });

  it('create: schedEnabled=true stores day and clears paymentTermsDays', async () => {
    const created = fakeContract({
      scheduledPaymentEnabled: true,
      paymentTermsDays: null,
      scheduledPaymentDay: 'friday',
    });
    const { service, contractModel } = await build(
      { create: jest.fn().mockResolvedValue(created) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    await service.create(
      BIZ,
      baseCreateDto({
        scheduledPaymentEnabled: true,
        scheduledPaymentDay: 'friday',
        paymentTermsDays: undefined,
      }),
      ACTOR,
    );
    expect(contractModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledPaymentEnabled: true,
        paymentTermsDays: null,
        scheduledPaymentDay: 'friday',
      }),
    );
  });

  it('update: switching to scheduled clears paymentTermsDays', async () => {
    const existing = fakeContract({
      scheduledPaymentEnabled: false,
      paymentTermsDays: 14,
    });
    const updated = fakeContract({
      scheduledPaymentEnabled: true,
      paymentTermsDays: null,
      scheduledPaymentDay: 'tuesday',
    });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    await service.update(
      VALID_CONTRACT_ID,
      BIZ,
      {
        scheduledPaymentEnabled: true,
        scheduledPaymentDay: 'tuesday',
      },
      ACTOR,
    );
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ paymentTermsDays: null }),
      }),
      expect.anything(),
    );
  });

  it('update: switching to payment terms clears scheduled day', async () => {
    const existing = fakeContract({
      scheduledPaymentEnabled: true,
      paymentTermsDays: null,
      scheduledPaymentDay: 'friday',
    });
    const updated = fakeContract({
      scheduledPaymentEnabled: false,
      paymentTermsDays: 7,
      scheduledPaymentDay: null,
    });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });
    await service.update(
      VALID_CONTRACT_ID,
      BIZ,
      {
        scheduledPaymentEnabled: false,
        paymentTermsDays: 7,
      },
      ACTOR,
    );
    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          scheduledPaymentEnabled: false,
          paymentTermsDays: 7,
          scheduledPaymentDay: null,
        }),
      }),
      expect.anything(),
    );
  });

  it('existing Contract without scheduledPaymentEnabled uses paymentTermsDays as-is', () => {
    const doc = fakeContract({
      paymentTermsDays: 14,
      scheduledPaymentEnabled: false,
    });
    const res = toContractResponse(doc as any);
    expect(res.paymentTermsDays).toBe(14);
    expect(res.scheduledPaymentEnabled).toBe(false);
  });
});

// ─── Calendar flow validation ──────────────────────────────────────────────────

describe('ContractsService — calendar flow validation', () => {
  const validHolCal = {
    _id: HOLIDAY_CAL_ID,
    flow: 'holidays',
    status: 'active',
  };
  const validPayCal = {
    _id: PAYMENT_CAL_ID,
    flow: 'payments',
    status: 'active',
  };

  it('create: rejects holiday calendar with wrong flow', async () => {
    const { service } = await build(
      { create: jest.fn() },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
      // Calendar has wrong flow (payments instead of holidays)
      {
        findOne: jest.fn(() =>
          mockChain({
            _id: HOLIDAY_CAL_ID,
            flow: 'payments',
            status: 'active',
          }),
        ),
      },
    );
    const dto = baseCreateDto({
      holidayRules: {
        enabled: true,
        calendarId: HOLIDAY_CAL_ID,
        behaviour: 'multiplier',
        multiplier: 2.0,
      },
    });
    await expect(service.create(BIZ, dto, ACTOR)).rejects.toThrow(
      'expected "holidays"',
    );
  });

  it('create: rejects holiday calendar belonging to another business', async () => {
    const { service } = await build(
      { create: jest.fn() },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
      // Calendar not found for this business
      { findOne: jest.fn(() => mockChain(null)) },
    );
    const dto = baseCreateDto({
      holidayRules: {
        enabled: true,
        calendarId: HOLIDAY_CAL_ID,
        behaviour: 'multiplier',
        multiplier: 2.0,
      },
    });
    await expect(service.create(BIZ, dto, ACTOR)).rejects.toThrow(
      'holidays calendar not found',
    );
  });

  it('create: rejects inactive holiday calendar on new assignment', async () => {
    const { service } = await build(
      { create: jest.fn() },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
      {
        findOne: jest.fn(() =>
          mockChain({
            _id: HOLIDAY_CAL_ID,
            flow: 'holidays',
            status: 'paused',
          }),
        ),
      },
    );
    const dto = baseCreateDto({
      holidayRules: {
        enabled: true,
        calendarId: HOLIDAY_CAL_ID,
        behaviour: 'multiplier',
        multiplier: 2.0,
      },
    });
    await expect(service.create(BIZ, dto, ACTOR)).rejects.toThrow('inactive');
  });

  it('create: validates payment calendar flow', async () => {
    let calCallCount = 0;
    const { service } = await build(
      { create: jest.fn().mockResolvedValue(fakeContract()) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
      {
        findOne: jest.fn(() =>
          mockChain(
            calCallCount++ === 0 ? null : validPayCal,
            // First call is for holiday (disabled, not called), second for payment
          ),
        ),
      },
    );
    const dto = baseCreateDto({
      paymentCalendarEnabled: true,
      paymentCalendarSubscriptionId: PAYMENT_CAL_ID,
    });
    // Calendar model returns active payments calendar
    const { service: svc2 } = await build(
      { create: jest.fn().mockResolvedValue(fakeContract()) },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
      { findOne: jest.fn(() => mockChain(validPayCal)) },
    );
    await expect(svc2.create(BIZ, dto, ACTOR)).resolves.toBeDefined();
  });

  it('create: rejects payment calendar with wrong flow', async () => {
    const { service } = await build(
      { create: jest.fn() },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
      {
        findOne: jest.fn(() =>
          mockChain({
            _id: PAYMENT_CAL_ID,
            flow: 'holidays',
            status: 'active',
          }),
        ),
      },
    );
    const dto = baseCreateDto({
      paymentCalendarEnabled: true,
      paymentCalendarSubscriptionId: PAYMENT_CAL_ID,
    });
    await expect(service.create(BIZ, dto, ACTOR)).rejects.toThrow(
      'expected "payments"',
    );
  });

  it('create: requires paymentCalendarSubscriptionId when paymentCalendarEnabled=true', async () => {
    const { service } = await build(
      { create: jest.fn() },
      { findOne: jest.fn(() => mockChain(fakeCustomer())) },
    );
    const dto = baseCreateDto({
      paymentCalendarEnabled: true,
      // paymentCalendarSubscriptionId omitted
    });
    await expect(service.create(BIZ, dto, ACTOR)).rejects.toThrow(
      'paymentCalendarSubscriptionId is required',
    );
  });

  it('update: rejects wrong-flow calendar on new assignment', async () => {
    const existing = fakeContract({
      holidayRules: { ...fakeContract().holidayRules, calendarId: null },
    });
    const { service } = await build(
      {
        findOne: jest.fn(() => mockChain(existing)),
        findOneAndUpdate: jest.fn(() => mockChain(existing)),
      },
      {},
      {
        findOne: jest.fn(() =>
          mockChain({
            _id: HOLIDAY_CAL_ID,
            flow: 'payments',
            status: 'active',
          }),
        ),
      },
    );
    await expect(
      service.update(
        VALID_CONTRACT_ID,
        BIZ,
        {
          holidayRules: { enabled: true, calendarId: HOLIDAY_CAL_ID },
        },
        ACTOR,
      ),
    ).rejects.toThrow('expected "holidays"');
  });

  it('update: persists paymentCalendarEnabled=true with subscriptionId', async () => {
    const existing = fakeContract();
    const updated = fakeContract({
      paymentCalendarEnabled: true,
      paymentCalendarSubscriptionId: PAYMENT_CAL_ID,
    });
    const { service, contractModel } = await build(
      {
        findOne: jest.fn(() => mockChain(existing)),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      },
      {},
      { findOne: jest.fn(() => mockChain(validPayCal)) },
    );

    await service.update(
      VALID_CONTRACT_ID,
      BIZ,
      {
        paymentCalendarEnabled: true,
        paymentCalendarSubscriptionId: PAYMENT_CAL_ID,
      },
      ACTOR,
    );

    expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          paymentCalendarEnabled: true,
          paymentCalendarSubscriptionId: PAYMENT_CAL_ID,
        }),
      }),
      expect.anything(),
    );
  });

  it('update: clears paymentCalendarSubscriptionId when disabled', async () => {
    const existing = fakeContract({
      paymentCalendarEnabled: true,
      paymentCalendarSubscriptionId: PAYMENT_CAL_ID,
    });
    const updated = fakeContract({
      paymentCalendarEnabled: false,
      paymentCalendarSubscriptionId: null,
    });
    const { service, contractModel } = await build({
      findOne: jest.fn(() => mockChain(existing)),
      findOneAndUpdate: jest.fn(() => mockChain(updated)),
    });

    await service.update(
      VALID_CONTRACT_ID,
      BIZ,
      {
        paymentCalendarEnabled: false,
      },
      ACTOR,
    );

    const call = (contractModel.findOneAndUpdate as jest.Mock).mock.calls[0];
    expect(call[1].$set.paymentCalendarEnabled).toBe(false);
    expect(call[1].$set.paymentCalendarSubscriptionId).toBeNull();
  });

  it('toContractResponse: includes paymentCalendarEnabled=false for legacy records', () => {
    const doc = fakeContract();
    delete (doc as any).paymentCalendarEnabled;
    const res = toContractResponse(doc as any);
    expect(res.paymentCalendarEnabled).toBe(false);
    expect(res.paymentCalendarSubscriptionId).toBeNull();
  });

  it('toContractResponse: clears subscriptionId when disabled', () => {
    const doc = fakeContract({
      paymentCalendarEnabled: false,
      paymentCalendarSubscriptionId: PAYMENT_CAL_ID,
    });
    const res = toContractResponse(doc as any);
    expect(res.paymentCalendarSubscriptionId).toBeNull();
  });

  it('toContractResponse: includes subscriptionId when enabled', () => {
    const doc = fakeContract({
      paymentCalendarEnabled: true,
      paymentCalendarSubscriptionId: PAYMENT_CAL_ID,
    });
    const res = toContractResponse(doc as any);
    expect(res.paymentCalendarEnabled).toBe(true);
    expect(res.paymentCalendarSubscriptionId).toBe(PAYMENT_CAL_ID);
  });
});

// ─── Contract notifications — Platform credential integration ─────────────────
//
// Contracts are internal ERP notifications delivered via Platform credentials
// (type: 'platform').  Each lifecycle method must emit the exact event key
// defined in the Contracts seed.
//
// Seed event keys (canonical form = domainKey.eventKey):
//   contracts.contract_created
//   contracts.contract_updated
//   contracts.contract_activated
//   contracts.contract_cancelled
//   contracts.contract_finished
//
// The relay client is fire-and-forget; delivery failures must never
// propagate to the caller.

describe('Contract notifications — platform credentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockComm.notifyEvent.mockResolvedValue(true);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  it('create: emits contracts.contract_created after successful persistence', async () => {
    const created = fakeContract();
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain(fakeCustomer())),
      },
    );

    await service.create(BIZ, baseCreateDto(), ACTOR);
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'contracts.contract_created' }),
    );
  });

  it('create: uses type="platform" — never "business"', async () => {
    const created = fakeContract();
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain(fakeCustomer())),
      },
    );

    await service.create(BIZ, baseCreateDto(), ACTOR);

    // Must wait for the fire-and-forget to settle
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'platform' }),
    );
    expect(mockComm.notifyEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'business' }),
    );
  });

  it('create: notification payload does not include businessId (platform type has none)', async () => {
    const created = fakeContract();
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain(fakeCustomer())),
      },
    );

    await service.create(BIZ, baseCreateDto(), ACTOR);
    await new Promise((r) => setImmediate(r));

    const call = mockComm.notifyEvent.mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call).not.toHaveProperty('businessId');
  });

  it('create: payload includes all required seed variables', async () => {
    const created = fakeContract({ status: 'active', positionName: 'Dev' });
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    await service.create(BIZ, baseCreateDto({ positionName: 'Dev' }), ACTOR);
    await new Promise((r) => setImmediate(r));

    const call = mockComm.notifyEvent.mock.calls[0]?.[0];
    expect(call?.data).toMatchObject({
      firstName: ACTOR.firstName,
      businessName: expect.any(String),
      customerName: expect.any(String),
      positionName: expect.any(String),
      contractStatus: expect.any(String),
      actionDate: expect.any(String),
    });
  });

  it('create: payload includes optional startDate and endDate', async () => {
    const created = fakeContract({
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    });
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    await service.create(BIZ, baseCreateDto(), ACTOR);
    await new Promise((r) => setImmediate(r));

    const call = mockComm.notifyEvent.mock.calls[0]?.[0];
    expect(call?.data).toHaveProperty('startDate');
    expect(call?.data).toHaveProperty('endDate');
  });

  it('create: notification failure does not propagate — contract is returned successfully', async () => {
    mockComm.notifyEvent.mockRejectedValue(new Error('Relay unreachable'));

    const created = fakeContract();
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    const result = await service.create(BIZ, baseCreateDto(), ACTOR);
    expect(result).toBeDefined();
    expect((result as any)._id).toBeDefined();
  });

  // ── update ──────────────────────────────────────────────────────────────────

  it('update: emits contracts.contract_updated', async () => {
    const existing = fakeContract();
    const updated = fakeContract({ positionName: 'Updated Dev' });
    const { service } = await build(
      {
        findOne: jest.fn(() => mockChain(existing)),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    await service.update(
      VALID_CONTRACT_ID,
      BIZ,
      { positionName: 'Updated Dev' },
      ACTOR,
    );
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'platform',
        event: 'contracts.contract_updated',
      }),
    );
  });

  it('update: uses type="platform"', async () => {
    const existing = fakeContract();
    const updated = fakeContract();
    const { service } = await build(
      {
        findOne: jest.fn(() => mockChain(existing)),
        findOneAndUpdate: jest.fn(() => mockChain(updated)),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    await service.update(VALID_CONTRACT_ID, BIZ, { notes: 'changed' }, ACTOR);
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'platform' }),
    );
  });

  // ── cancel ──────────────────────────────────────────────────────────────────

  it('cancel: emits contracts.contract_cancelled with type="platform"', async () => {
    const existing = fakeContract({ status: 'active' });
    const cancelled = fakeContract({ status: 'cancelled' });
    const { service } = await build(
      {
        findOne: jest.fn(() => mockChain(existing)),
        findOneAndUpdate: jest.fn(() => mockChain(cancelled)),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    await service.cancel(VALID_CONTRACT_ID, BIZ, ACTOR);
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'platform',
        event: 'contracts.contract_cancelled',
      }),
    );
  });

  // ── finish ──────────────────────────────────────────────────────────────────

  it('finish: emits contracts.contract_finished with type="platform"', async () => {
    const existing = fakeContract({ status: 'active' });
    const finished = fakeContract({ status: 'finished' });
    const { service } = await build(
      {
        findOne: jest.fn(() => mockChain(existing)),
        findOneAndUpdate: jest.fn(() => mockChain(finished)),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    await service.finish(VALID_CONTRACT_ID, BIZ, ACTOR);
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'platform',
        event: 'contracts.contract_finished',
      }),
    );
  });

  // ── activate ─────────────────────────────────────────────────────────────────

  it('activate: emits contracts.contract_activated with type="platform"', async () => {
    const existing = fakeContract({ status: 'inactive' });
    const activated = fakeContract({ status: 'active' });
    const { service } = await build(
      {
        findOne: jest.fn(() => mockChain(existing)),
        findOneAndUpdate: jest.fn(() => mockChain(activated)),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    await service.activate(VALID_CONTRACT_ID, BIZ, ACTOR);
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'platform',
        event: 'contracts.contract_activated',
      }),
    );
  });

  // ── recipient guard ──────────────────────────────────────────────────────────

  it('skips notification when actor email is empty — does not call notifyEvent', async () => {
    const created = fakeContract();
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
    );

    const actorNoEmail = { ...ACTOR, email: '' };
    await service.create(BIZ, baseCreateDto(), actorNoEmail);
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).not.toHaveBeenCalled();
  });

  it('skips notification when actor email is undefined — does not call notifyEvent', async () => {
    const created = fakeContract();
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
    );

    const actorNoEmail = { ...ACTOR, email: undefined as any };
    await service.create(BIZ, baseCreateDto(), actorNoEmail);
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).not.toHaveBeenCalled();
  });

  it('business operation succeeds even when notifyEvent resolves false', async () => {
    mockComm.notifyEvent.mockResolvedValue(false);

    const created = fakeContract();
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    const result = await service.create(BIZ, baseCreateDto(), ACTOR);
    expect(result).toBeDefined();
  });

  it('no notification is emitted when create persistence fails', async () => {
    const { service } = await build(
      {
        create: jest.fn().mockRejectedValue(new Error('Mongo write error')),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
    );

    await expect(service.create(BIZ, baseCreateDto(), ACTOR)).rejects.toThrow();
    expect(mockComm.notifyEvent).not.toHaveBeenCalled();
  });

  it('notification recipient is actor.email — not a customer or hardcoded address', async () => {
    const created = fakeContract();
    const { service } = await build(
      {
        create: jest.fn().mockResolvedValue(created),
        findOne: jest.fn(() => mockChain(fakeCustomer())),
      },
      {
        findOne: jest.fn(() => mockChain(fakeCustomer())),
        findById: jest.fn(() => mockChain({ displayName: 'Acme Ltd' })),
      },
    );

    await service.create(BIZ, baseCreateDto(), ACTOR);
    await new Promise((r) => setImmediate(r));

    expect(mockComm.notifyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ email: ACTOR.email }),
    );
  });
});
