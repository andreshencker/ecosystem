// src/payments/services/payments-testing-page-definition.service.ts
//
// Resolves and returns the canonical Payment Testing page definition for a given
// authenticated company connection.
//
// Orchestration (mirrors payments-refunds-page-definition.service.ts):
//   1. Validate company owns the connection (via resolveRuntime + company guard).
//   2. Derive the connection environment from the stored credential mode.
//   3. Compute provider-level capabilities.
//   4. Compute connection-level capabilities (environment restrictions).
//   5. Intersect into effective capabilities.
//   6. Build the context (no credentials passed).
//   7. Delegate to the provider's getPaymentTestingPageDefinition() or use the
//      generic default.
//   8. Filter out components whose capability is not available.
//   9. Return — never include credentials or secrets.

import { Injectable, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { isPaymentTestingPageDefinitionProvider } from '../interfaces/payment-provider.interface';
import {
  buildGenericTestingPageDefinition,
  filterTestingDefinitionComponents,
  computeConnectionCapabilities,
  intersectCapabilities,
  type PaymentTestingPageDefinition,
  type PaymentTestingPageDefinitionContext,
} from '../contracts/payment-testing-page-definition.contract';
import { CapabilityStatus } from '../enums/payment.enums';

@Injectable()
export class PaymentsTestingPageDefinitionService {
  private readonly logger = new Logger(
    PaymentsTestingPageDefinitionService.name,
  );

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Builds and returns the canonical Payment Testing page definition for the
   * given authenticated company + connection combination.
   *
   * Company isolation is enforced by `PaymentsService.resolveRuntime`, which
   * verifies the credential belongs to the company before decrypting.
   *
   * Environment is detected from BOTH:
   *   - credentials.mode field (CoinGate: 'test' | 'live')
   *   - credentials.secretKey prefix (Stripe: sk_test_ → test, sk_live_ → live)
   *
   * @param companyId    - From the authenticated JWT; never from request body.
   * @param connectionId - ProviderCredentials._id of the selected connection.
   */
  async getTestingPageDefinition(
    companyId: string,
    connectionId: string,
  ): Promise<PaymentTestingPageDefinition> {
    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      connectionId,
    );

    const environment = this.extractEnvironment(runtime.credentials);

    this.logger.debug(
      `[getTestingPageDefinition] companyId=${companyId} connectionId=${connectionId} ` +
        `providerKey=${runtime.providerKey} environment=${environment ?? 'unknown'}`,
    );

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

    const ctx: PaymentTestingPageDefinitionContext = {
      companyId,
      providerCredentialId: connectionId,
      providerKey: runtime.providerKey,
      environment,
      providerCapabilities,
      connectionCapabilities,
      effectiveCapabilities,
    };

    let definition: PaymentTestingPageDefinition;

    if (isPaymentTestingPageDefinitionProvider(runtime.provider)) {
      definition = await runtime.provider.getPaymentTestingPageDefinition(ctx);
    } else {
      this.logger.debug(
        `[getTestingPageDefinition] provider "${runtime.providerKey}" has no custom testing definition — using generic default`,
      );
      definition = buildGenericTestingPageDefinition(
        runtime.providerKey,
        connectionId,
        environment,
        effectiveCapabilities,
      );
    }

    return filterTestingDefinitionComponents(definition, effectiveCapabilities);
  }

  /**
   * Extracts the connection environment from the decrypted credentials.
   *
   * Checks in order:
   *   1. credentials.mode field (CoinGate and any provider using a mode field)
   *   2. credentials.secretKey prefix (Stripe: sk_test_ → test, sk_live_ → live)
   *
   * Returns null when neither check resolves a known environment.
   */
  private extractEnvironment(
    credentials: Record<string, unknown>,
  ): 'test' | 'live' | null {
    // Check mode field first (CoinGate and any other provider using mode)
    const mode = credentials['mode'];
    if (mode === 'test' || mode === 'live') return mode;

    // Fall back to secretKey prefix for Stripe
    const key = credentials['secretKey'];
    if (typeof key !== 'string') return null;
    if (key.startsWith('sk_test_')) return 'test';
    if (key.startsWith('sk_live_')) return 'live';
    return null;
  }
}
