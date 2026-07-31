// src/payments/tests/payments-units.service.spec.ts
//
// Unit tests for PaymentsUnitsService.
// PaymentsService and the provider adapter are fully mocked.

import { Types } from 'mongoose';
import { PaymentsUnitsService } from '../services/payments-units.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderRuntimeContext } from '../types/payment.types';
import type { PaymentUnit } from '../contracts/payment-unit.contract';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId().toString();
const ACCOUNT_ID = new Types.ObjectId().toString();

function makeUnit(code: string): PaymentUnit {
  return { code, label: code, kind: 'fiat' };
}

function makeUnitProvider(listFn: jest.Mock = jest.fn()) {
  return {
    providerKey: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe provider',
    supportsPaymentUnits: true as const,
    listPaymentUnits: listFn,
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'stripe',
      displayName: 'Stripe',
      description: '',
      connectionType: 'api_key',
    }),
  };
}

function makeNoUnitProvider(): IPaymentProvider {
  return {
    providerKey: 'no-units',
    displayName: 'No Units',
    description: 'Provider without payment units',
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'no-units',
      displayName: 'No Units',
      description: '',
      connectionType: 'api_key',
    }),
  };
}

type MockPaymentsService = {
  resolveRuntime: jest.Mock;
};

function makePaymentsService(provider: unknown = makeUnitProvider()): MockPaymentsService {
  return {
    resolveRuntime: jest.fn().mockResolvedValue({
      accountId: ACCOUNT_ID,
      companyId: COMPANY_ID,
      providerKey: 'stripe',
      environment: 'test',
      provider,
      credentials: { secretKey: 'sk_test_mock', mode: 'test' },
    } as unknown as PaymentProviderRuntimeContext),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentsUnitsService.listPaymentUnits()', () => {
  it('calls resolveRuntime with correct companyId and accountId', async () => {
    const listFn = jest.fn().mockResolvedValue([makeUnit('AUD')]);
    const paymentsService = makePaymentsService(makeUnitProvider(listFn));
    const service = new PaymentsUnitsService(paymentsService as never);

    await service.listPaymentUnits(COMPANY_ID, ACCOUNT_ID);

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(COMPANY_ID, ACCOUNT_ID);
  });

  it('returns { data: PaymentUnit[] } from the provider', async () => {
    const units = [makeUnit('AUD'), makeUnit('USD')];
    const listFn = jest.fn().mockResolvedValue(units);
    const paymentsService = makePaymentsService(makeUnitProvider(listFn));
    const service = new PaymentsUnitsService(paymentsService as never);

    const result = await service.listPaymentUnits(COMPANY_ID, ACCOUNT_ID);

    expect(result).toEqual({ data: units });
  });

  it('throws PaymentCapabilityNotSupportedError when provider lacks paymentUnits capability', async () => {
    const paymentsService = makePaymentsService(makeNoUnitProvider());
    const service = new PaymentsUnitsService(paymentsService as never);

    await expect(service.listPaymentUnits(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentCapabilityNotSupportedError,
    );
  });

  it('propagates PaymentProviderUnavailableError from the provider', async () => {
    const listFn = jest
      .fn()
      .mockRejectedValue(new PaymentProviderUnavailableError('stripe'));
    const paymentsService = makePaymentsService(makeUnitProvider(listFn));
    const service = new PaymentsUnitsService(paymentsService as never);

    await expect(service.listPaymentUnits(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('returned units do not contain credential values', async () => {
    const units = [makeUnit('AUD')];
    const listFn = jest.fn().mockResolvedValue(units);
    const paymentsService = makePaymentsService(makeUnitProvider(listFn));
    const service = new PaymentsUnitsService(paymentsService as never);

    const result = await service.listPaymentUnits(COMPANY_ID, ACCOUNT_ID);
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_mock');
  });

  it('returns an empty array when provider returns no units', async () => {
    const listFn = jest.fn().mockResolvedValue([]);
    const paymentsService = makePaymentsService(makeUnitProvider(listFn));
    const service = new PaymentsUnitsService(paymentsService as never);

    const result = await service.listPaymentUnits(COMPANY_ID, ACCOUNT_ID);

    expect(result).toEqual({ data: [] });
  });
});
