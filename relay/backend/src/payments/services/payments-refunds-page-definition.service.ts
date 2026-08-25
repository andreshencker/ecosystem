// src/payments/services/payments-refunds-page-definition.service.ts
//
// Resolves and returns the canonical Refunds page definition for a given
// authenticated company connection.
//
// Orchestration (mirrors payments-page-definition.service.ts):
//   1. Validate company owns the connection (via resolveRuntime + company guard).
//   2. Derive the connection environment from the stored credential mode.
//   3. Compute provider-level capabilities.
//   4. Compute connection-level capabilities (environment restrictions).
//   5. Intersect into effective capabilities.
//   6. Build the context (no credentials passed).
//   7. Delegate to the provider's getRefundsPageDefinition() or use the generic default.
//   8. Filter out components whose capability is not available.
//   9. Return — never include credentials or secrets.

import { Injectable, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { isRefundsPageDefinitionProvider } from '../interfaces/payment-provider.interface';
import {
  buildGenericRefundsPageDefinition,
  filterRefundDefinitionComponents,
  computeConnectionCapabilities,
  intersectCapabilities,
  type RefundsPageDefinition,
  type RefundsPageDefinitionContext,
} from '../contracts/refunds-page-definition.contract';
import { CapabilityStatus } from '../enums/payment.enums';

@Injectable()
export class PaymentsRefundsPageDefinitionService {
  private readonly logger = new Logger(
    PaymentsRefundsPageDefinitionService.name,
  );

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Builds and returns the canonical Refunds page definition for the given
   * authenticated company + connection combination.
   *
   * Company isolation is enforced by `PaymentsService.resolveRuntime`, which
   * verifies the credential belongs to the company before decrypting.
   *
   * @param companyId    - From the authenticated JWT; never from request body.
   * @param connectionId - ProviderCredentials._id of the selected connection.
   */
  async getRefundsPageDefinition(
    companyId: string,
    connectionId: string,
  ): Promise<RefundsPageDefinition> {
    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      connectionId,
    );

    const rawMode = runtime.credentials['mode'];
    const environment: 'test' | 'live' | null =
      rawMode === 'live' ? 'live' : rawMode === 'test' ? 'test' : null;

    this.logger.debug(
      `[getRefundsPageDefinition] companyId=${companyId} connectionId=${connectionId} ` +
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

    const ctx: RefundsPageDefinitionContext = {
      companyId,
      providerCredentialId: connectionId,
      providerKey: runtime.providerKey,
      environment,
      providerCapabilities,
      connectionCapabilities,
      effectiveCapabilities,
    };

    let definition: RefundsPageDefinition;

    if (isRefundsPageDefinitionProvider(runtime.provider)) {
      definition = await runtime.provider.getRefundsPageDefinition(ctx);
    } else {
      this.logger.debug(
        `[getRefundsPageDefinition] provider "${runtime.providerKey}" has no custom refund definition — using generic default`,
      );
      definition = buildGenericRefundsPageDefinition(
        runtime.providerKey,
        connectionId,
        effectiveCapabilities,
      );
    }

    return filterRefundDefinitionComponents(definition, effectiveCapabilities);
  }
}
