// src/payments/tests/payments-testing.service.spec.ts
//
// Unit tests for PaymentsTestingService.
// PaymentsService and the provider adapter are fully mocked.

import { Types } from 'mongoose';
import { PaymentsTestingService } from '../services/payments-testing.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentConfigurationInvalidError,
} from '../errors/payment.errors';
import { PaymentCapability, CapabilityStatus } from '../enums/payment.enums';
import { PaymentTestScenario } from '../enums/payment-test-scenario.enum';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderRuntimeContext } from '../types/payment.types';
import type { PaymentTestResult } from '../types/payment-testing.types';
import { CreatePaymentTestDto } from '../dto/create-payment-test.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId().toString();
const CONNECTION_ID = new Types.ObjectId().toString();

const ALL_SCENARIOS = [
  PaymentTestScenario.Success,
  PaymentTestScenario.CardDeclined,
  PaymentTestScenario.InsufficientFunds,
  PaymentTestScenario.AuthenticationRequired,
  PaymentTestScenario.ProcessingError,
];

function makeTestResult(
  overrides: Partial<PaymentTestResult> = {},
): PaymentTestResult {
  return {
    providerKey: 'stripe',
    connectionId: CONNECTION_ID,
    environment: 'test',
    testId: 'gfy_test_123_abc',
    paymentMethod: 'card',
    amountMinor: 1000,
    currency: 'aud',
    status: 'succeeded',
    scenario: PaymentTestScenario.Success,
    requiresUserAction: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeTestingProvider(
  getSupportedTestScenariosFn: jest.Mock = jest
    .fn()
    .mockReturnValue(ALL_SCENARIOS),
  createPaymentTestFn: jest.Mock = jest
    .fn()
    .mockResolvedValue(makeTestResult()),
) {
  return {
    providerKey: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe provider',
    supportsPaymentTesting: true as const,
    getSupportedTestScenarios: getSupportedTestScenariosFn,
    createPaymentTest: createPaymentTestFn,
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

function makeNoTestingProvider(): IPaymentProvider {
  return {
    providerKey: 'no-testing',
    displayName: 'No Testing',
    description: 'Provider without testing',
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'no-testing',
      displayName: 'No Testing',
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
  provider: unknown = makeTestingProvider(),
  secretKey = 'sk_test_mock_secret',
): MockPaymentsService {
  return {
    resolveRuntime: jest.fn().mockResolvedValue({
      accountId: CONNECTION_ID,
      companyId: COMPANY_ID,
      providerKey: 'stripe',
      environment: 'test',
      provider,
      credentials: { secretKey, publishableKey: 'pk_test_mock', mode: 'test' },
    } as unknown as PaymentProviderRuntimeContext),
    assertCapability: jest.fn(),
  };
}

function makeDto(
  overrides: Partial<CreatePaymentTestDto> = {},
): CreatePaymentTestDto {
  return {
    connectionId: CONNECTION_ID,
    paymentMethodKey: 'card',
    amountMinor: 1000,
    currency: 'AUD',
    scenario: PaymentTestScenario.Success,
    ...overrides,
  } as CreatePaymentTestDto;
}

// ─── Tests — getSupportedScenarios ───────────────────────────────────────────

describe('PaymentsTestingService.getSupportedScenarios()', () => {
  it('resolves runtime with the provided companyId and connectionId', async () => {
    const paymentsService = makePaymentsService();
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    await service.getSupportedScenarios(COMPANY_ID, CONNECTION_ID, 'card');

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(
      COMPANY_ID,
      CONNECTION_ID,
    );
  });

  it('returns scenarios from the provider for a testable method', async () => {
    const paymentsService = makePaymentsService();
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    const result = await service.getSupportedScenarios(
      COMPANY_ID,
      CONNECTION_ID,
      'card',
    );

    expect(result).toEqual(ALL_SCENARIOS);
  });

  it('returns empty array when provider does not implement IPaymentTestingProvider', async () => {
    const paymentsService = makePaymentsService(makeNoTestingProvider());
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    const result = await service.getSupportedScenarios(
      COMPANY_ID,
      CONNECTION_ID,
      'card',
    );

    expect(result).toEqual([]);
  });
});

// ─── Tests — createPaymentTest ────────────────────────────────────────────────

describe('PaymentsTestingService.createPaymentTest()', () => {
  it('resolves runtime using the provided companyId and connectionId from dto', async () => {
    const paymentsService = makePaymentsService();
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    await service.createPaymentTest(COMPANY_ID, makeDto());

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(
      COMPANY_ID,
      CONNECTION_ID,
    );
  });

  it('returns the PaymentTestResult from the provider', async () => {
    const expected = makeTestResult();
    const createFn = jest.fn().mockResolvedValue(expected);
    const paymentsService = makePaymentsService(
      makeTestingProvider(jest.fn().mockReturnValue(ALL_SCENARIOS), createFn),
    );
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    const result = await service.createPaymentTest(COMPANY_ID, makeDto());

    expect(result).toBe(expected);
  });

  it('throws PaymentCapabilityNotSupportedError when provider does not support testing', async () => {
    const paymentsService = makePaymentsService(makeNoTestingProvider());
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    await expect(
      service.createPaymentTest(COMPANY_ID, makeDto()),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('throws PaymentConfigurationInvalidError when credentials are live', async () => {
    const paymentsService = makePaymentsService(
      makeTestingProvider(),
      'sk_live_real_key',
    );
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    await expect(
      service.createPaymentTest(COMPANY_ID, makeDto()),
    ).rejects.toThrow(PaymentConfigurationInvalidError);
  });

  it('throws PaymentConfigurationInvalidError when credentials have unknown prefix', async () => {
    const paymentsService = makePaymentsService(
      makeTestingProvider(),
      'rk_restricted_key',
    );
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    await expect(
      service.createPaymentTest(COMPANY_ID, makeDto()),
    ).rejects.toThrow(PaymentConfigurationInvalidError);
  });

  it('throws PaymentCapabilityNotSupportedError when method has no testable scenarios', async () => {
    const paymentsService = makePaymentsService(
      makeTestingProvider(jest.fn().mockReturnValue([])),
    );
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    await expect(
      service.createPaymentTest(
        COMPANY_ID,
        makeDto({ paymentMethodKey: 'apple_pay' }),
      ),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('throws PaymentCapabilityNotSupportedError for unsupported scenario', async () => {
    // Only return Success scenario — CardDeclined should throw
    const paymentsService = makePaymentsService(
      makeTestingProvider(
        jest.fn().mockReturnValue([PaymentTestScenario.Success]),
      ),
    );
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    await expect(
      service.createPaymentTest(
        COMPANY_ID,
        makeDto({ scenario: PaymentTestScenario.CardDeclined }),
      ),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('does not persist any test result locally — no DB write', async () => {
    // The service has no repository or model dependency — no persistence possible.
    // This test documents that invariant: PaymentsTestingService accepts only
    // PaymentsService in its constructor, which has no write path for test results.
    const paymentsService = makePaymentsService();
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    // Verify constructor shape — only paymentsService, no model injections
    const ctorLength = PaymentsTestingService.length;
    expect(ctorLength).toBe(1);

    // Run a test and confirm it resolves without error
    const result = await service.createPaymentTest(COMPANY_ID, makeDto());
    expect(result).toBeDefined();
  });

  it('returned result does not contain credential values', async () => {
    const paymentsService = makePaymentsService();
    const service = new PaymentsTestingService(
      paymentsService as unknown as never,
    );

    const result = await service.createPaymentTest(COMPANY_ID, makeDto());
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_mock_secret');
    expect(json).not.toContain('pk_test_mock');
  });
});
