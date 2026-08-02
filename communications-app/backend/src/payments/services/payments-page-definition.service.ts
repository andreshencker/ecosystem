// src/payments/services/payments-page-definition.service.ts
//
// Resolves and returns the canonical Payments page definition for a given
// authenticated company connection.
//
// Orchestration:
//   1. Validate company owns the connection (via resolveRuntime + company guard).
//   2. Derive the connection environment from the stored credential mode.
//   3. Compute provider-level capabilities.
//   4. Compute connection-level capabilities (environment restrictions).
//   5. Intersect into effective capabilities.
//   6. Build the context (no credentials passed).
//   7. Delegate to the provider's getPaymentsPageDefinition() or use the generic default.
//   8. Filter out 'hide'-behaviour components that are not available.
//   9. Return — never include credentials or secrets.

import { Injectable, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { isPageDefinitionProvider } from '../interfaces/payment-provider.interface';
import {
  buildGenericPageDefinition,
  computeConnectionCapabilities,
  filterDefinitionComponents,
  intersectCapabilities,
  type PaymentsPageDefinition,
  type PaymentsPageDefinitionContext,
} from '../contracts/payments-page-definition.contract';
import { CapabilityStatus } from '../enums/payment.enums';

@Injectable()
export class PaymentsPageDefinitionService {
  private readonly logger = new Logger(PaymentsPageDefinitionService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Builds and returns the canonical Payments page definition for the given
   * authenticated company + connection combination.
   *
   * Company isolation is enforced by `PaymentsService.resolveRuntime`, which
   * verifies the credential belongs to the company before decrypting.
   *
   * @param companyId   - From the authenticated JWT; never from the request body.
   * @param connectionId - ProviderCredentials._id of the selected connection.
   */
  async getPageDefinition(
    companyId: string,
    connectionId: string,
  ): Promise<PaymentsPageDefinition> {
    // Steps 1–2: validate ownership, decrypt credentials, get provider adapter.
    // resolveRuntime throws PaymentProviderNotFoundError / PaymentProviderCredentials-
    // UnavailableError etc. when company/credential checks fail — the controller maps these.
    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      connectionId,
    );

    // Step 2: derive environment from the stored credential mode field.
    const rawMode = runtime.credentials['mode'];
    const environment: 'test' | 'live' | null =
      rawMode === 'live' ? 'live' : rawMode === 'test' ? 'test' : null;

    this.logger.debug(
      `[getPageDefinition] companyId=${companyId} connectionId=${connectionId} ` +
        `providerKey=${runtime.providerKey} environment=${environment ?? 'unknown'}`,
    );

    // Step 3: provider capabilities.
    const providerCapabilities = runtime.provider.getCapabilities()
      .capabilities as Record<string, CapabilityStatus>;

    // Step 4: connection capabilities (environment-aware restrictions).
    const connectionCapabilities = computeConnectionCapabilities(
      providerCapabilities,
      environment,
    );

    // Step 5: effective capabilities (intersection).
    const effectiveCapabilities = intersectCapabilities(
      providerCapabilities,
      connectionCapabilities,
    );

    // Step 6: build context — credentials are NOT included.
    const ctx: PaymentsPageDefinitionContext = {
      companyId,
      providerCredentialId: connectionId,
      providerKey: runtime.providerKey,
      environment,
      providerCapabilities,
      connectionCapabilities,
      effectiveCapabilities,
    };

    // Step 7: delegate to provider-specific definition or generic fallback.
    let definition: PaymentsPageDefinition;

    if (isPageDefinitionProvider(runtime.provider)) {
      definition = await runtime.provider.getPaymentsPageDefinition(ctx);
    } else {
      this.logger.debug(
        `[getPageDefinition] provider "${runtime.providerKey}" has no custom definition — using generic default`,
      );
      definition = buildGenericPageDefinition(
        runtime.providerKey,
        connectionId,
        effectiveCapabilities,
      );
    }

    // Step 8: filter components whose capability is not available and whose
    // unavailableBehaviour is 'hide'. Other behaviours are kept for the frontend
    // to display the appropriate placeholder (Not supported / Unavailable).
    const filtered = filterDefinitionComponents(
      definition,
      effectiveCapabilities,
    );

    // Step 9: return — never expose runtime.credentials in the result.
    return filtered;
  }
}
