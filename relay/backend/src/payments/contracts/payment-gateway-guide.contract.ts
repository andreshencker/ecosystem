// src/payments/contracts/payment-gateway-guide.contract.ts
//
// Canonical integration guide returned by each provider adapter.
// The frontend renders this data verbatim — no provider-specific logic
// is ever embedded in generic UI components.

export interface GatewayGuideStep {
  stepNumber: number;
  title: string;
  description: string;
  /** Optional code snippet shown below the description. */
  codeExample?: string;
  language?: 'json' | 'typescript' | 'bash' | 'text';
  notes?: string[];
}

export interface GatewayGuideRequestExample {
  label: string;
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
}

export interface GatewayGuideResponseExample {
  label: string;
  description?: string;
  statusCode: number;
  body: Record<string, unknown>;
}

export interface GatewayGuidePresentationType {
  /** Machine-readable mode key. */
  mode: string;
  label: string;
  description: string;
  recommendedFor: string[];
  supported: boolean;
}

export interface GatewayGuide {
  providerKey: string;
  displayName: string;
  /** One-sentence summary of the provider for the integration portal. */
  description: string;
  /** What the integrating application must have ready before starting. */
  prerequisites: string[];
  /** High-level payment flow types supported by this provider. */
  supportedFlows: string[];
  /** Numbered implementation steps returned by the provider adapter. */
  implementationSteps: GatewayGuideStep[];
  /** Canonical HTTP request examples (no provider secrets). */
  requestExamples: GatewayGuideRequestExample[];
  /** Canonical HTTP response examples (no provider secrets). */
  responseExamples: GatewayGuideResponseExample[];
  /** Presentation modes the provider supports. */
  presentationTypes: GatewayGuidePresentationType[];
  /** Provider-specific testing guidance. */
  testingInstructions: string[];
  /** Known limitations and edge cases. */
  limitations: string[];
  /**
   * Pattern for the public webhook receiver endpoint.
   * The {connectionId} placeholder is the ProviderCredentials._id.
   */
  webhookReceiverPath: string;
}
