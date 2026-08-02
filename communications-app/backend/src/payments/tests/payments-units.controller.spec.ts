// src/payments/tests/payments-units.controller.spec.ts
//
// Unit tests for PaymentsUnitsController.
// PaymentsUnitsService is fully mocked.

import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PaymentsUnitsController } from '../controllers/payments-units.controller';
import {
  PaymentCapabilityNotSupportedError,
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotFoundError,
  PaymentProviderNotConfiguredError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import type { PaymentUnit } from '../contracts/payment-unit.contract';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId().toString();
const ACCOUNT_ID = new Types.ObjectId().toString();

function makeUnit(code: string): PaymentUnit {
  return { code, label: code, kind: 'fiat' };
}

function makeAuthCtx(companyId?: string): AuthContext {
  return {
    actorType: 'user',
    companyId: companyId ?? COMPANY_ID,
  } as AuthContext;
}

type MockService = { listPaymentUnits: jest.Mock };

function makeService(units: PaymentUnit[] = []): MockService {
  return {
    listPaymentUnits: jest.fn().mockResolvedValue({ data: units }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentsUnitsController.listPaymentUnits()', () => {
  it('returns { data: PaymentUnit[] } from the service', async () => {
    const units = [makeUnit('AUD'), makeUnit('USD')];
    const service = makeService(units);
    const ctrl = new PaymentsUnitsController(service as never);

    const result = await ctrl.listPaymentUnits(makeAuthCtx(), ACCOUNT_ID);

    expect(result).toEqual({ data: units });
  });

  it('throws UnauthorizedException when companyId is missing', async () => {
    const service = makeService();
    const ctrl = new PaymentsUnitsController(service as never);

    await expect(
      ctrl.listPaymentUnits({ actorType: 'user' } as AuthContext, ACCOUNT_ID),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('passes companyId and accountId to the service', async () => {
    const service = makeService();
    const ctrl = new PaymentsUnitsController(service as never);

    await ctrl.listPaymentUnits(makeAuthCtx(), ACCOUNT_ID);

    expect(service.listPaymentUnits).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
    );
  });

  it('maps PaymentProviderNotFoundError → NotFoundException', async () => {
    const service = makeService();
    service.listPaymentUnits.mockRejectedValue(
      new PaymentProviderNotFoundError('stripe'),
    );
    const ctrl = new PaymentsUnitsController(service as never);

    await expect(
      ctrl.listPaymentUnits(makeAuthCtx(), ACCOUNT_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentProviderNotConfiguredError → UnprocessableEntityException', async () => {
    const service = makeService();
    service.listPaymentUnits.mockRejectedValue(
      new PaymentProviderNotConfiguredError('stripe'),
    );
    const ctrl = new PaymentsUnitsController(service as never);

    await expect(
      ctrl.listPaymentUnits(makeAuthCtx(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderCredentialsUnavailableError → UnprocessableEntityException', async () => {
    const service = makeService();
    service.listPaymentUnits.mockRejectedValue(
      new PaymentProviderCredentialsUnavailableError('stripe'),
    );
    const ctrl = new PaymentsUnitsController(service as never);

    await expect(
      ctrl.listPaymentUnits(makeAuthCtx(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCapabilityNotSupportedError → UnprocessableEntityException', async () => {
    const service = makeService();
    service.listPaymentUnits.mockRejectedValue(
      new PaymentCapabilityNotSupportedError('stripe', 'paymentUnits'),
    );
    const ctrl = new PaymentsUnitsController(service as never);

    await expect(
      ctrl.listPaymentUnits(makeAuthCtx(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError → ServiceUnavailableException', async () => {
    const service = makeService();
    service.listPaymentUnits.mockRejectedValue(
      new PaymentProviderUnavailableError('stripe'),
    );
    const ctrl = new PaymentsUnitsController(service as never);

    await expect(
      ctrl.listPaymentUnits(makeAuthCtx(), ACCOUNT_ID),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('does not expose credential values in the response', async () => {
    const units = [makeUnit('AUD')];
    const service = makeService(units);
    const ctrl = new PaymentsUnitsController(service as never);

    const result = await ctrl.listPaymentUnits(makeAuthCtx(), ACCOUNT_ID);
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_');
  });
});
