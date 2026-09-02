// src/payments/services/payments-reference-data.service.ts
//
// Resolves and returns canonical reference-data option lists for a given
// authenticated company connection and declared source.
//
// Orchestration:
//   1. Validate company owns the connection (via resolveRuntime).
//   2. Validate the source against the controlled enum.
//   3. Resolve the provider adapter.
//   4. Resolve the connection environment.
//   5. Compute effective capabilities.
//   6. Build the context (credentials included for live provider calls).
//   7. Delegate to the provider's getPaymentReferenceData().
//   8. Return safe canonical options — never raw provider responses.
//
// Security invariants:
//   - Credentials stay in-memory only; never appear in the response.
//   - Only controlled PaymentReferenceDataSource values are accepted.
//   - Provider adapters are responsible for filtering to safe, valid options.

import { Injectable, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { isReferenceDataProvider } from '../interfaces/payment-provider.interface';
import {
  isValidReferenceDataSource,
  type PaymentReferenceDataContext,
  type PaymentReferenceDataResponse,
} from '../contracts/payment-reference-data.contract';
import {
  computeConnectionCapabilities,
  intersectCapabilities,
} from '../contracts/payments-page-definition.contract';
import { CapabilityStatus } from '../enums/payment.enums';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';

@Injectable()
export class PaymentsReferenceDataService {
  private readonly logger = new Logger(PaymentsReferenceDataService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Returns canonical reference-data options for the given source.
   *
   * @param companyId    - From the authenticated JWT; never from the request body.
   * @param connectionId - ProviderCredentials._id of the selected connection.
   * @param source       - Validated PaymentReferenceDataSource string.
   */
  async getReferenceData(
    companyId: string,
    connectionId: string,
    source: string,
  ): Promise<PaymentReferenceDataResponse> {
    // 1. Validate source before any DB/network call — fail fast on unknown values.
    if (!isValidReferenceDataSource(source)) {
      throw new PaymentCapabilityNotSupportedError(
        'unknown',
        `reference-data.${source}`,
      );
    }

    const validSource = source;

    // 2. Resolve runtime — enforces company ownership and decrypts credentials.
    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      connectionId,
    );

    // 3. Resolve environment from credentials.
    const rawMode = runtime.credentials['mode'];
    const secretKey = runtime.credentials['secretKey'];
    let environment: 'test' | 'live' | null = null;
    if (typeof secretKey === 'string') {
      if (secretKey.startsWith('sk_test_')) environment = 'test';
      else if (secretKey.startsWith('sk_live_')) environment = 'live';
    } else if (rawMode === 'test' || rawMode === 'live') {
      environment = rawMode;
    }

    this.logger.debug(
      `[getReferenceData] companyId=${companyId} connectionId=${connectionId} ` +
        `providerKey=${runtime.providerKey} source=${validSource} environment=${environment ?? 'unknown'}`,
    );

    // 4. Compute capabilities.
    const providerCapabilities = runtime.provider.getCapabilities()
      .capabilities as Record<string, CapabilityStatus>;
    const connectionCapabilities = computeConnectionCapabilities(
      providerCapabilities,
      environment,
    );
    const effectiveCapabilities = intersectCapabilities(
      providerCapabilities,
      connectionCapabilities,
    );

    // 5. Check provider supports reference data.
    if (!isReferenceDataProvider(runtime.provider)) {
      this.logger.debug(
        `[getReferenceData] provider "${runtime.providerKey}" does not implement IPaymentReferenceDataProvider`,
      );
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        `reference-data.${validSource}`,
      );
    }

    // 6. Build context — credentials included because live provider calls require auth.
    const ctx: PaymentReferenceDataContext = {
      companyId,
      providerCredentialId: connectionId,
      providerKey: runtime.providerKey,
      environment,
      credentials: runtime.credentials,
      effectiveCapabilities,
    };

    // 7. Delegate to provider — never return ctx.credentials in the result.
    const result = await runtime.provider.getPaymentReferenceData(
      ctx,
      validSource,
    );

    // 8. Return safe canonical options.
    return result;
  }
}
