// src/payments/tests/payments-payment-methods.controller.spec.ts
//
// Unit tests for PaymentsPaymentMethodsController.
// PaymentsPaymentMethodsService is fully mocked.

import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentsPaymentMethodsController } from '../controllers/payments-payment-methods.controller';
import { PaymentsPaymentMethodsService } from '../services/payments-payment-methods.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentConfigurationInvalidError,
  PaymentCredentialChannelMismatchError,
  PaymentCredentialsInvalidError,
  PaymentMethodNotConfigurableError,
  PaymentMethodNotFoundError,
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotConfiguredError,
  PaymentProviderNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { PaymentMethodConfiguration } from '../contracts/payment-method-configuration.contract';
import { PaymentMethodConfigurationStatus } from '../enums/payment-method-configuration-status.enum';
import { PaymentMethodType } from '../enums/payment-method-type.enum';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import type { UpdatePaymentMethodDto } from '../dto/update-payment-method.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = 'company-abc-123';
const ACCOUNT_ID = '6776e4f1a0c1234567890abc';
const METHOD_ID = 'card';

function makeAuthContext(companyId: string = COMPANY_ID): AuthContext {
  return { companyId } as unknown as AuthContext;
}

function makeNoCompanyContext(): AuthContext {
  return {} as unknown as AuthContext;
}

function makeMethodConfig(
  overrides: Partial<PaymentMethodConfiguration> = {},
): PaymentMethodConfiguration {
  return {
    id: METHOD_ID,
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

type ServiceMock = {
  listPaymentMethodConfigurations: jest.Mock;
  getPaymentMethodConfiguration: jest.Mock;
  updatePaymentMethodConfiguration: jest.Mock;
};

function makeServiceMock(): ServiceMock {
  return {
    listPaymentMethodConfigurations: jest.fn(),
    getPaymentMethodConfiguration: jest.fn(),
    updatePaymentMethodConfiguration: jest.fn(),
  };
}

// ─── listPaymentMethods ───────────────────────────────────────────────────────

describe('PaymentsPaymentMethodsController.listPaymentMethods()', () => {
  it('calls service with companyId from AuthContext and accountId from route', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockResolvedValueOnce([
      makeMethodConfig(),
    ]);

    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );
    await controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID);

    expect(service.listPaymentMethodConfigurations).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
    );
  });

  it('returns { data, total } shape', async () => {
    const service = makeServiceMock();
    const configs = [makeMethodConfig(), makeMethodConfig({ id: 'klarna' })];
    service.listPaymentMethodConfigurations.mockResolvedValueOnce(configs);

    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );
    const result = await controller.listPaymentMethods(
      makeAuthContext(),
      ACCOUNT_ID,
    );

    expect(result.data).toBe(configs);
    expect(result.total).toBe(2);
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeNoCompanyContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('never accepts companyId from URL params — only from AuthContext', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockResolvedValueOnce([]);

    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );
    await controller.listPaymentMethods(
      makeAuthContext('trusted-company'),
      ACCOUNT_ID,
    );

    const [calledCompanyId] = service.listPaymentMethodConfigurations.mock
      .calls[0] as [string];
    expect(calledCompanyId).toBe('trusted-company');
  });

  // ─── Error → HTTP mapping ──────────────────────────────────────────────────

  it('maps PaymentProviderNotFoundError to 404', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockRejectedValueOnce(
      new PaymentProviderNotFoundError('unknown'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentProviderNotConfiguredError to 422', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockRejectedValueOnce(
      new PaymentProviderNotConfiguredError('stripe'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCapabilityNotSupportedError to 422', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockRejectedValueOnce(
      new PaymentCapabilityNotSupportedError('stripe', 'paymentMethods'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentConfigurationInvalidError to 422', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockRejectedValueOnce(
      new PaymentConfigurationInvalidError('empty list'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps PaymentCredentialsInvalidError to 422', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError(),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderCredentialsUnavailableError to 422', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockRejectedValueOnce(
      new PaymentProviderCredentialsUnavailableError('stripe'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialChannelMismatchError to 422', async () => {
    const service = makeServiceMock();
    service.listPaymentMethodConfigurations.mockRejectedValueOnce(
      new PaymentCredentialChannelMismatchError(ACCOUNT_ID, 'payment'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rethrows unknown errors without modification', async () => {
    const service = makeServiceMock();
    const unknownError = new TypeError('Unexpected type error');
    service.listPaymentMethodConfigurations.mockRejectedValueOnce(unknownError);
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.listPaymentMethods(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(TypeError);
  });
});

// ─── getPaymentMethod ─────────────────────────────────────────────────────────

describe('PaymentsPaymentMethodsController.getPaymentMethod()', () => {
  it('calls service with companyId, accountId, and methodId', async () => {
    const service = makeServiceMock();
    service.getPaymentMethodConfiguration.mockResolvedValueOnce(
      makeMethodConfig(),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await controller.getPaymentMethod(makeAuthContext(), ACCOUNT_ID, METHOD_ID);

    expect(service.getPaymentMethodConfiguration).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
      METHOD_ID,
    );
  });

  it('returns the canonical PaymentMethodConfiguration', async () => {
    const service = makeServiceMock();
    const config = makeMethodConfig();
    service.getPaymentMethodConfiguration.mockResolvedValueOnce(config);
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    const result = await controller.getPaymentMethod(
      makeAuthContext(),
      ACCOUNT_ID,
      METHOD_ID,
    );

    expect(result).toBe(config);
  });

  it('maps PaymentMethodNotFoundError to 404', async () => {
    const service = makeServiceMock();
    service.getPaymentMethodConfiguration.mockRejectedValueOnce(
      new PaymentMethodNotFoundError('unknown'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.getPaymentMethod(makeAuthContext(), ACCOUNT_ID, 'unknown'),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── updatePaymentMethod ──────────────────────────────────────────────────────

describe('PaymentsPaymentMethodsController.updatePaymentMethod()', () => {
  it('calls service with companyId, accountId, methodId, and enabled', async () => {
    const service = makeServiceMock();
    service.updatePaymentMethodConfiguration.mockResolvedValueOnce(
      makeMethodConfig({ enabled: false }),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );
    const dto: UpdatePaymentMethodDto = { enabled: false };

    await controller.updatePaymentMethod(
      makeAuthContext(),
      ACCOUNT_ID,
      METHOD_ID,
      dto,
    );

    expect(service.updatePaymentMethodConfiguration).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
      METHOD_ID,
      false,
    );
  });

  it('returns the updated PaymentMethodConfiguration', async () => {
    const service = makeServiceMock();
    const config = makeMethodConfig({ enabled: true });
    service.updatePaymentMethodConfiguration.mockResolvedValueOnce(config);
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );
    const dto: UpdatePaymentMethodDto = { enabled: true };

    const result = await controller.updatePaymentMethod(
      makeAuthContext(),
      ACCOUNT_ID,
      METHOD_ID,
      dto,
    );

    expect(result).toBe(config);
  });

  it('maps PaymentMethodNotFoundError to 404', async () => {
    const service = makeServiceMock();
    service.updatePaymentMethodConfiguration.mockRejectedValueOnce(
      new PaymentMethodNotFoundError('unknown'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.updatePaymentMethod(makeAuthContext(), ACCOUNT_ID, 'unknown', {
        enabled: true,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentMethodNotConfigurableError to 422', async () => {
    const service = makeServiceMock();
    service.updatePaymentMethodConfiguration.mockRejectedValueOnce(
      new PaymentMethodNotConfigurableError('card'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.updatePaymentMethod(makeAuthContext(), ACCOUNT_ID, 'card', {
        enabled: false,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.updatePaymentMethodConfiguration.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.updatePaymentMethod(makeAuthContext(), ACCOUNT_ID, 'card', {
        enabled: true,
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.updatePaymentMethod(
        makeNoCompanyContext(),
        ACCOUNT_ID,
        'card',
        {
          enabled: true,
        },
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.updatePaymentMethodConfiguration.mockResolvedValueOnce(
      makeMethodConfig(),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    const result = await controller.updatePaymentMethod(
      makeAuthContext(),
      ACCOUNT_ID,
      'card',
      { enabled: true },
    );
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_');
    expect(json).not.toContain('credentials');
  });

  // ── Stable key requirement ────────────────────────────────────────────────
  // The methodId in the URL must be the stable provider field key, never the
  // display label. 'afterpay_clearpay' is used as methodId, not 'Afterpay / Clearpay'.

  it('passes the stable Stripe field key (afterpay_clearpay) to the service — not the display label', async () => {
    const service = makeServiceMock();
    service.updatePaymentMethodConfiguration.mockResolvedValueOnce(
      makeMethodConfig({ id: 'afterpay_clearpay' }),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await controller.updatePaymentMethod(
      makeAuthContext(),
      ACCOUNT_ID,
      'afterpay_clearpay',
      { enabled: true },
    );

    const [, , calledMethodId] = service.updatePaymentMethodConfiguration.mock
      .calls[0] as [string, string, string, boolean];
    expect(calledMethodId).toBe('afterpay_clearpay');
    expect(calledMethodId).not.toBe('Afterpay / Clearpay');
  });

  it('passes enabled=true when adding a method', async () => {
    const service = makeServiceMock();
    service.updatePaymentMethodConfiguration.mockResolvedValueOnce(
      makeMethodConfig({ enabled: true }),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await controller.updatePaymentMethod(
      makeAuthContext(),
      ACCOUNT_ID,
      'afterpay_clearpay',
      { enabled: true },
    );

    const [, , , calledEnabled] = service.updatePaymentMethodConfiguration.mock
      .calls[0] as [string, string, string, boolean];
    expect(calledEnabled).toBe(true);
  });

  it('maps PaymentMethodNotConfigurableError (overridable=false / Stripe rejection) to 422 with the provider message', async () => {
    const service = makeServiceMock();
    service.updatePaymentMethodConfiguration.mockRejectedValueOnce(
      new PaymentMethodNotConfigurableError(
        'afterpay_clearpay',
        'This payment method type is not available to accounts in your country',
      ),
    );
    const controller = new PaymentsPaymentMethodsController(
      service as unknown as PaymentsPaymentMethodsService,
    );

    await expect(
      controller.updatePaymentMethod(
        makeAuthContext(),
        ACCOUNT_ID,
        'afterpay_clearpay',
        {
          enabled: true,
        },
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});
