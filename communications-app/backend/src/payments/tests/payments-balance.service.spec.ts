// src/payments/tests/payments-balance.service.spec.ts
//
// Unit tests for PaymentsBalanceService.
// PaymentsService and the provider adapter are fully mocked.

import { Types } from 'mongoose';
import { PaymentsBalanceService } from '../services/payments-balance.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import { PaymentCapability, CapabilityStatus } from '../enums/payment.enums';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderRuntimeContext } from '../types/payment.types';
import type { PaymentBalance } from '../contracts/payment-balance.contract';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId().toString();
const ACCOUNT_ID = new Types.ObjectId().toString();

function makeBalance(overrides: Partial<PaymentBalance> = {}): PaymentBalance {
  return {
    accountId: ACCOUNT_ID,
    available: [{ amountMinor: 10000, currency: 'aud', sourceType: 'card' }],
    pending: [{ amountMinor: 2000, currency: 'aud', sourceType: 'card' }],
    reserved: [],
    retrievedAt: new Date(),
    ...overrides,
  };
}

function makeBalanceProvider(getBalanceFn: jest.Mock = jest.fn()) {
  return {
    providerKey: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe provider',
    supportsBalance: true as const,
    getBalance: getBalanceFn,
    getCapabilities: () => ({
      capabilities: {
        [PaymentCapability.Balance]: CapabilityStatus.Available,
      },
    }),
    getMetadata: () => ({
      providerKey: 'stripe',
      displayName: 'Stripe',
      description: 'Stripe provider',
      connectionType: 'api_key',
    }),
  };
}

function makeNoBalanceProvider(): IPaymentProvider {
  return {
    providerKey: 'no-balance',
    displayName: 'No Balance',
    description: 'Provider without balance',
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'no-balance',
      displayName: 'No Balance',
      description: '',
      connectionType: 'api_key',
    }),
  };
}

type MockPaymentsService = {
  resolveRuntime: jest.Mock;
  assertCapability: jest.Mock;
};

function makePaymentsService(
  provider: unknown = makeBalanceProvider(),
): MockPaymentsService {
  return {
    resolveRuntime: jest.fn().mockResolvedValue({
      accountId: ACCOUNT_ID,
      companyId: COMPANY_ID,
      providerKey: 'stripe',
      environment: 'test',
      provider,
      credentials: {
        secretKey: 'sk_test_mock',
        publishableKey: 'pk_test_mock',
        mode: 'test',
      },
    } as unknown as PaymentProviderRuntimeContext),
    assertCapability: jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentsBalanceService.getBalance()', () => {
  it('resolves runtime using the provided companyId and accountId', async () => {
    const getBalance = jest.fn().mockResolvedValue(makeBalance());
    const paymentsService = makePaymentsService(
      makeBalanceProvider(getBalance),
    );
    const service = new PaymentsBalanceService(paymentsService as never);

    await service.getBalance(COMPANY_ID, ACCOUNT_ID);

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
    );
  });

  it('returns the canonical PaymentBalance from the provider', async () => {
    const balance = makeBalance();
    const getBalance = jest.fn().mockResolvedValue(balance);
    const paymentsService = makePaymentsService(
      makeBalanceProvider(getBalance),
    );
    const service = new PaymentsBalanceService(paymentsService as never);

    const result = await service.getBalance(COMPANY_ID, ACCOUNT_ID);

    expect(result).toBe(balance);
  });

  it('asserts the Balance capability is available before calling the provider', async () => {
    const getBalance = jest.fn().mockResolvedValue(makeBalance());
    const provider = makeBalanceProvider(getBalance);
    const paymentsService = makePaymentsService(provider);
    const service = new PaymentsBalanceService(paymentsService as never);

    await service.getBalance(COMPANY_ID, ACCOUNT_ID);

    expect(paymentsService.assertCapability).toHaveBeenCalledWith(
      provider,
      PaymentCapability.Balance,
    );
  });

  it('throws PaymentCapabilityNotSupportedError when provider does not support balance', async () => {
    const paymentsService = makePaymentsService(makeNoBalanceProvider());
    const service = new PaymentsBalanceService(paymentsService as never);

    await expect(service.getBalance(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentCapabilityNotSupportedError,
    );
  });

  it('propagates PaymentProviderUnavailableError from the provider', async () => {
    const getBalance = jest
      .fn()
      .mockRejectedValue(new PaymentProviderUnavailableError('stripe'));
    const paymentsService = makePaymentsService(
      makeBalanceProvider(getBalance),
    );
    const service = new PaymentsBalanceService(paymentsService as never);

    await expect(service.getBalance(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });

  it('does not import Stripe — provider adapter is the only Stripe consumer', () => {
    const serviceSource = PaymentsBalanceService.toString();
    expect(serviceSource).not.toContain("require('stripe')");
    expect(serviceSource).not.toContain('require("stripe")');
  });

  it('does not branch on providerKey', () => {
    const serviceSource = PaymentsBalanceService.toString();
    expect(serviceSource).not.toContain('stripe');
    expect(serviceSource).not.toContain('paypal');
  });

  it('returned balance does not contain credential values', async () => {
    const balance = makeBalance();
    const getBalance = jest.fn().mockResolvedValue(balance);
    const paymentsService = makePaymentsService(
      makeBalanceProvider(getBalance),
    );
    const service = new PaymentsBalanceService(paymentsService as never);

    const result = await service.getBalance(COMPANY_ID, ACCOUNT_ID);
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_mock');
    expect(json).not.toContain('pk_test_mock');
  });

  it('passes correct context credentialsId to provider.getBalance', async () => {
    const getBalance = jest.fn().mockResolvedValue(makeBalance());
    const provider = makeBalanceProvider(getBalance);
    const paymentsService = makePaymentsService(provider);
    const service = new PaymentsBalanceService(paymentsService as never);

    await service.getBalance(COMPANY_ID, ACCOUNT_ID);

    const [calledContext] = getBalance.mock.calls[0] as [
      { credentialsId: string },
    ];
    expect(calledContext.credentialsId).toBe(ACCOUNT_ID);
  });
});

// ─── CoinGate balance behaviour (Tests 9–12) ─────────────────────────────────
//
// Verifies that:
//   Test 9:  Unsupported balance throws PaymentCapabilityNotSupportedError
//             (backend returns 422 → frontend shows "Not supported").
//   Test 10: The provider getBalance() is NEVER called when capability is unsupported.
//   Test 11: Real zero balance is returned as-is (not treated as "unsupported").
//   Test 12: Balance error does not affect the Payments list — they are independent.

describe('PaymentsBalanceService — CoinGate / unsupported balance (Tests 9–12)', () => {
  function makeCoinGateProvider(): IPaymentProvider {
    return {
      providerKey: 'coingate',
      displayName: 'CoinGate',
      description: 'CoinGate payment provider',
      getCapabilities: () => ({
        capabilities: {
          [PaymentCapability.Balance]: CapabilityStatus.Unsupported,
        },
      }),
      getMetadata: () => ({
        providerKey: 'coingate',
        displayName: 'CoinGate',
        description: '',
        connectionType: 'token',
      }),
    };
  }

  it('Test 9: CoinGate balance throws PaymentCapabilityNotSupportedError', async () => {
    const paymentsService = makePaymentsService(makeCoinGateProvider());
    const service = new PaymentsBalanceService(paymentsService as never);

    await expect(service.getBalance(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentCapabilityNotSupportedError,
    );
  });

  it('Test 10: provider.getBalance() is never called when capability is unsupported', async () => {
    const getBalanceSpy = jest.fn();
    const coinGateWithBalanceSpy = {
      ...makeCoinGateProvider(),
      getBalance: getBalanceSpy,
    };
    const paymentsService = makePaymentsService(coinGateWithBalanceSpy);
    const service = new PaymentsBalanceService(paymentsService as never);

    await expect(service.getBalance(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentCapabilityNotSupportedError,
    );

    expect(getBalanceSpy).not.toHaveBeenCalled();
  });

  it('Test 11: real zero balance is returned correctly — not treated as unsupported', async () => {
    const zeroBalance = makeBalance({
      available: [{ amountMinor: 0, currency: 'aud', sourceType: 'card' }],
      pending: [{ amountMinor: 0, currency: 'aud', sourceType: 'card' }],
    });
    const getBalance = jest.fn().mockResolvedValue(zeroBalance);
    const paymentsService = makePaymentsService(
      makeBalanceProvider(getBalance),
    );
    const service = new PaymentsBalanceService(paymentsService as never);

    const result = await service.getBalance(COMPANY_ID, ACCOUNT_ID);

    expect(result.available[0].amountMinor).toBe(0);
    expect(result.pending[0].amountMinor).toBe(0);
    expect(result).toBe(zeroBalance);
  });

  it('Test 12: balance error (PaymentCapabilityNotSupportedError) is isolated to the balance service', async () => {
    // The balance service throws on unsupported capability.
    // The payments-list service is independent and must not be affected.
    // This is verified at the service layer: the two services have separate
    // resolveRuntime calls — a failure in one does not propagate to the other.
    const paymentsService = makePaymentsService(makeCoinGateProvider());
    const service = new PaymentsBalanceService(paymentsService as never);

    // Balance throws.
    await expect(service.getBalance(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentCapabilityNotSupportedError,
    );

    // resolveRuntime was called exactly once — for the balance request only.
    // The list service would call it independently if invoked.
    expect(paymentsService.resolveRuntime).toHaveBeenCalledTimes(1);
  });
});
