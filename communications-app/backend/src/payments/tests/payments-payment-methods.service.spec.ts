// src/payments/tests/payments-payment-methods.service.spec.ts
//
// Unit tests for PaymentsPaymentMethodsService.
// PaymentsService and the provider adapter are fully mocked.

import { Types } from 'mongoose';
import { PaymentsPaymentMethodsService } from '../services/payments-payment-methods.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentMethodNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import { PaymentCapability, CapabilityStatus } from '../enums/payment.enums';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderRuntimeContext } from '../types/payment.types';
import type { PaymentMethodConfiguration } from '../contracts/payment-method-configuration.contract';
import { PaymentMethodConfigurationStatus } from '../enums/payment-method-configuration-status.enum';
import { PaymentMethodType } from '../enums/payment-method-type.enum';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId().toString();
const ACCOUNT_ID = new Types.ObjectId().toString();

function makeMethodConfig(
  overrides: Partial<PaymentMethodConfiguration> = {},
): PaymentMethodConfiguration {
  return {
    id: 'card',
    accountId: ACCOUNT_ID,
    type: PaymentMethodType.Card,
    displayName: 'Credit & Debit Cards',
    available: true,
    enabled: true,
    configurable: true,
    status: PaymentMethodConfigurationStatus.Active,
    reason: null,
    supportedCurrencies: [],
    supportedCountries: [],
    ...overrides,
  };
}

function makeMethodConfigProvider(
  fns: {
    listPaymentMethodConfigurations?: jest.Mock;
    getPaymentMethodConfiguration?: jest.Mock;
    updatePaymentMethodConfiguration?: jest.Mock;
  } = {},
) {
  return {
    providerKey: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe provider',
    supportsPaymentMethods: true as const,
    listPaymentMethodConfigurations:
      fns.listPaymentMethodConfigurations ?? jest.fn(),
    getPaymentMethodConfiguration:
      fns.getPaymentMethodConfiguration ?? jest.fn(),
    updatePaymentMethodConfiguration:
      fns.updatePaymentMethodConfiguration ?? jest.fn(),
    getCapabilities: () => ({
      capabilities: {
        [PaymentCapability.PaymentMethods]: CapabilityStatus.Available,
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

function makeNoMethodProvider(): IPaymentProvider {
  return {
    providerKey: 'no-methods',
    displayName: 'No Methods',
    description: 'Provider without payment methods',
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'no-methods',
      displayName: 'No Methods',
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
  provider: unknown = makeMethodConfigProvider(),
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

// ─── listPaymentMethodConfigurations ─────────────────────────────────────────

describe('PaymentsPaymentMethodsService.listPaymentMethodConfigurations()', () => {
  it('resolves runtime using the provided companyId and accountId', async () => {
    const listFn = jest.fn().mockResolvedValue([makeMethodConfig()]);
    const paymentsService = makePaymentsService(
      makeMethodConfigProvider({ listPaymentMethodConfigurations: listFn }),
    );
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    await service.listPaymentMethodConfigurations(COMPANY_ID, ACCOUNT_ID);

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
    );
  });

  it('returns the list from the provider', async () => {
    const configs = [makeMethodConfig(), makeMethodConfig({ id: 'klarna' })];
    const listFn = jest.fn().mockResolvedValue(configs);
    const paymentsService = makePaymentsService(
      makeMethodConfigProvider({ listPaymentMethodConfigurations: listFn }),
    );
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    const result = await service.listPaymentMethodConfigurations(
      COMPANY_ID,
      ACCOUNT_ID,
    );

    expect(result).toBe(configs);
  });

  it('asserts the PaymentMethods capability before calling the provider', async () => {
    const listFn = jest.fn().mockResolvedValue([makeMethodConfig()]);
    const provider = makeMethodConfigProvider({
      listPaymentMethodConfigurations: listFn,
    });
    const paymentsService = makePaymentsService(provider);
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    await service.listPaymentMethodConfigurations(COMPANY_ID, ACCOUNT_ID);

    expect(paymentsService.assertCapability).toHaveBeenCalledWith(
      provider,
      PaymentCapability.PaymentMethods,
    );
  });

  it('throws PaymentCapabilityNotSupportedError when provider lacks payment methods support', async () => {
    const paymentsService = makePaymentsService(makeNoMethodProvider());
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    await expect(
      service.listPaymentMethodConfigurations(COMPANY_ID, ACCOUNT_ID),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('propagates PaymentProviderUnavailableError from the provider', async () => {
    const listFn = jest
      .fn()
      .mockRejectedValue(new PaymentProviderUnavailableError('stripe'));
    const paymentsService = makePaymentsService(
      makeMethodConfigProvider({ listPaymentMethodConfigurations: listFn }),
    );
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    await expect(
      service.listPaymentMethodConfigurations(COMPANY_ID, ACCOUNT_ID),
    ).rejects.toThrow(PaymentProviderUnavailableError);
  });

  it('does not import Stripe — provider adapter is the only Stripe consumer', () => {
    const serviceSource = PaymentsPaymentMethodsService.toString();
    expect(serviceSource).not.toContain("require('stripe')");
    expect(serviceSource).not.toContain('require("stripe")');
  });

  it('does not branch on providerKey', () => {
    const serviceSource = PaymentsPaymentMethodsService.toString();
    expect(serviceSource).not.toContain("'stripe'");
    expect(serviceSource).not.toContain("'paypal'");
  });
});

// ─── getPaymentMethodConfiguration ───────────────────────────────────────────

describe('PaymentsPaymentMethodsService.getPaymentMethodConfiguration()', () => {
  it('delegates to provider.getPaymentMethodConfiguration with correct args', async () => {
    const config = makeMethodConfig();
    const getFn = jest.fn().mockResolvedValue(config);
    const paymentsService = makePaymentsService(
      makeMethodConfigProvider({ getPaymentMethodConfiguration: getFn }),
    );
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    await service.getPaymentMethodConfiguration(COMPANY_ID, ACCOUNT_ID, 'card');

    const [, methodId] = getFn.mock.calls[0] as [unknown, string];
    expect(methodId).toBe('card');
  });

  it('returns the canonical PaymentMethodConfiguration from the provider', async () => {
    const config = makeMethodConfig();
    const getFn = jest.fn().mockResolvedValue(config);
    const paymentsService = makePaymentsService(
      makeMethodConfigProvider({ getPaymentMethodConfiguration: getFn }),
    );
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    const result = await service.getPaymentMethodConfiguration(
      COMPANY_ID,
      ACCOUNT_ID,
      'card',
    );

    expect(result).toBe(config);
  });

  it('throws PaymentMethodNotFoundError when provider throws it', async () => {
    const getFn = jest
      .fn()
      .mockRejectedValue(new PaymentMethodNotFoundError('unknown'));
    const paymentsService = makePaymentsService(
      makeMethodConfigProvider({ getPaymentMethodConfiguration: getFn }),
    );
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    await expect(
      service.getPaymentMethodConfiguration(COMPANY_ID, ACCOUNT_ID, 'unknown'),
    ).rejects.toThrow(PaymentMethodNotFoundError);
  });
});

// ─── updatePaymentMethodConfiguration ────────────────────────────────────────

describe('PaymentsPaymentMethodsService.updatePaymentMethodConfiguration()', () => {
  it('delegates to provider.updatePaymentMethodConfiguration with correct args', async () => {
    const config = makeMethodConfig();
    const updateFn = jest.fn().mockResolvedValue(config);
    const paymentsService = makePaymentsService(
      makeMethodConfigProvider({ updatePaymentMethodConfiguration: updateFn }),
    );
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    await service.updatePaymentMethodConfiguration(
      COMPANY_ID,
      ACCOUNT_ID,
      'card',
      true,
    );

    const [, methodId, enabled] = updateFn.mock.calls[0] as [
      unknown,
      string,
      boolean,
    ];
    expect(methodId).toBe('card');
    expect(enabled).toBe(true);
  });

  it('returns the updated PaymentMethodConfiguration', async () => {
    const config = makeMethodConfig({ enabled: false });
    const updateFn = jest.fn().mockResolvedValue(config);
    const paymentsService = makePaymentsService(
      makeMethodConfigProvider({ updatePaymentMethodConfiguration: updateFn }),
    );
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    const result = await service.updatePaymentMethodConfiguration(
      COMPANY_ID,
      ACCOUNT_ID,
      'card',
      false,
    );

    expect(result).toBe(config);
  });

  it('passes context credentialsId correctly to the provider', async () => {
    const config = makeMethodConfig();
    const updateFn = jest.fn().mockResolvedValue(config);
    const paymentsService = makePaymentsService(
      makeMethodConfigProvider({ updatePaymentMethodConfiguration: updateFn }),
    );
    const service = new PaymentsPaymentMethodsService(paymentsService as never);

    await service.updatePaymentMethodConfiguration(
      COMPANY_ID,
      ACCOUNT_ID,
      'card',
      true,
    );

    const [calledContext] = updateFn.mock.calls[0] as [
      { credentialsId: string },
      string,
      boolean,
    ];
    expect(calledContext.credentialsId).toBe(ACCOUNT_ID);
  });
});
