// src/payments/tests/payments-testing.controller.spec.ts
//
// Unit tests for PaymentsTestingController.
// PaymentsTestingService is fully mocked.

import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PaymentsTestingController } from '../controllers/payments-testing.controller';
import { PaymentsTestingService } from '../services/payments-testing.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentConfigurationInvalidError,
  PaymentCredentialChannelMismatchError,
  PaymentCredentialsInvalidError,
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotConfiguredError,
  PaymentProviderNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import { PaymentTestScenario } from '../enums/payment-test-scenario.enum';
import type { PaymentTestResult } from '../types/payment-testing.types';
import type { CreatePaymentTestDto } from '../dto/create-payment-test.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = 'company-abc-123';
const CONNECTION_ID = new Types.ObjectId().toString();

function makeAuthContext(companyId: string = COMPANY_ID): AuthContext {
  return { companyId } as unknown as AuthContext;
}

function makeNoCompanyContext(): AuthContext {
  return {} as unknown as AuthContext;
}

type ServiceMock = {
  getSupportedScenarios: jest.Mock;
  createPaymentTest: jest.Mock;
};

function makeServiceMock(): ServiceMock {
  return {
    getSupportedScenarios: jest.fn(),
    createPaymentTest: jest.fn(),
  };
}

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
    createdAt: new Date('2025-06-01T12:00:00.000Z'),
    ...overrides,
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

// ─── Tests — GET /payments/testing/scenarios ──────────────────────────────────

describe('PaymentsTestingController.getSupportedScenarios()', () => {
  it('returns scenarios from the service', async () => {
    const service = makeServiceMock();
    service.getSupportedScenarios.mockResolvedValueOnce([
      PaymentTestScenario.Success,
      PaymentTestScenario.CardDeclined,
    ]);

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );
    const result = await controller.getSupportedScenarios(makeAuthContext(), {
      connectionId: CONNECTION_ID,
      methodKey: 'card',
    });

    expect(result.scenarios).toEqual([
      PaymentTestScenario.Success,
      PaymentTestScenario.CardDeclined,
    ]);
  });

  it('calls service with companyId from AuthContext', async () => {
    const service = makeServiceMock();
    service.getSupportedScenarios.mockResolvedValueOnce([]);

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );
    await controller.getSupportedScenarios(makeAuthContext(), {
      connectionId: CONNECTION_ID,
      methodKey: 'card',
    });

    expect(service.getSupportedScenarios).toHaveBeenCalledWith(
      COMPANY_ID,
      CONNECTION_ID,
      'card',
    );
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.getSupportedScenarios(makeNoCompanyContext(), {
        connectionId: CONNECTION_ID,
        methodKey: 'card',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.getSupportedScenarios.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.getSupportedScenarios(makeAuthContext(), {
        connectionId: CONNECTION_ID,
        methodKey: 'card',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

// ─── Tests — POST /payments/testing ──────────────────────────────────────────

describe('PaymentsTestingController.createPaymentTest()', () => {
  it('returns result with createdAt serialised as ISO string', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockResolvedValueOnce(makeTestResult());

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );
    const result = await controller.createPaymentTest(
      makeAuthContext(),
      makeDto(),
    );

    expect(typeof result.createdAt).toBe('string');
    expect(result.createdAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('calls service with companyId from AuthContext', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockResolvedValueOnce(makeTestResult());

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );
    const dto = makeDto();
    await controller.createPaymentTest(makeAuthContext(), dto);

    expect(service.createPaymentTest).toHaveBeenCalledWith(COMPANY_ID, dto);
  });

  it('never accepts companyId from the body — only from AuthContext', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockResolvedValueOnce(makeTestResult());

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );
    await controller.createPaymentTest(
      makeAuthContext('trusted-company'),
      makeDto(),
    );

    const [calledCompanyId] = service.createPaymentTest.mock.calls[0] as [
      string,
      CreatePaymentTestDto,
    ];
    expect(calledCompanyId).toBe('trusted-company');
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeNoCompanyContext(), makeDto()),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps PaymentProviderNotFoundError to 404', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockRejectedValueOnce(
      new PaymentProviderNotFoundError('unknown'),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeAuthContext(), makeDto()),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentConfigurationInvalidError (live connection) to 422', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockRejectedValueOnce(
      new PaymentConfigurationInvalidError(
        'Payment Testing requires a test or sandbox connection.',
      ),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeAuthContext(), makeDto()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCapabilityNotSupportedError to 422', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockRejectedValueOnce(
      new PaymentCapabilityNotSupportedError('stripe', 'paymentTesting'),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeAuthContext(), makeDto()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderNotConfiguredError to 422', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockRejectedValueOnce(
      new PaymentProviderNotConfiguredError('stripe'),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeAuthContext(), makeDto()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialsInvalidError to 422', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError(),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeAuthContext(), makeDto()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderCredentialsUnavailableError to 422', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockRejectedValueOnce(
      new PaymentProviderCredentialsUnavailableError('stripe'),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeAuthContext(), makeDto()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialChannelMismatchError to 422', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockRejectedValueOnce(
      new PaymentCredentialChannelMismatchError(CONNECTION_ID, 'payment'),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeAuthContext(), makeDto()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeAuthContext(), makeDto()),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('rethrows unknown errors without modification', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockRejectedValueOnce(
      new TypeError('Unexpected type error'),
    );

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );

    await expect(
      controller.createPaymentTest(makeAuthContext(), makeDto()),
    ).rejects.toThrow(TypeError);
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.createPaymentTest.mockResolvedValueOnce(makeTestResult());

    const controller = new PaymentsTestingController(
      service as unknown as PaymentsTestingService,
    );
    const result = await controller.createPaymentTest(
      makeAuthContext(),
      makeDto(),
    );
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('credentials');
    expect(json).not.toContain('sk_');
  });
});
