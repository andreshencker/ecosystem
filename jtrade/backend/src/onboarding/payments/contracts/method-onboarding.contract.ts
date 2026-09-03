import type { ProviderPaymentStatus } from '../schemas/provider-payment.schema';

/**
 * The shape every payment-method folder (`stripe/`, `coingate/`, ...) must
 * implement. The orchestrator only knows this contract — it never knows what
 * Stripe or CoinGate are. Adding a method = a new folder implementing this.
 */
export interface MethodOnboarding {
  /** Catalogue key — matches Relay's provider key and `ProviderPayment.method`. */
  readonly method: string;

  /**
   * First step: ask Relay to create whatever the gateway needs and return the
   * references jtrade must persist. Called once, when there is no row yet.
   */
  start(input: StartMethodInput): Promise<StartMethodResult>;

  /**
   * Produce a fresh URL to send the provider to the gateway's configuration
   * screen — for both the first pass and resuming an abandoned one.
   */
  configurationLink(
    relayAccountId: string,
    urls: ConfigurationUrls,
  ): Promise<ConfigurationLink>;

  /** Ask Relay for the current state of the method. Read-only. */
  refreshState(relayAccountId: string): Promise<MethodState>;
}

export interface StartMethodInput {
  providerOrganizationId: string;
  /** ISO-2 country — some gateways need it up front and cannot change it later. */
  country?: string;
  email?: string;
  businessName?: string;
}

export interface StartMethodResult {
  /** Relay payment connection that was used. */
  relayConnectionId: string;
  /** Relay's connected-account record id. */
  relayAccountId: string;
  /** Gateway-side account id (e.g. Stripe `acct_...`), if any. */
  providerAccountId: string | null;
  state: MethodState;
}

export interface ConfigurationUrls {
  /** Where the gateway sends the provider when the link expired. */
  refreshUrl: string;
  /** Where the gateway sends the provider when they finish / step away. */
  returnUrl: string;
}

export interface ConfigurationLink {
  url: string;
  expiresAt: Date;
}

/** Normalised state — every method maps its gateway's status onto this. */
export interface MethodState {
  status: ProviderPaymentStatus;
  providerAccountId: string | null;
  requirementsDue: string[];
  disabledReason: string | null;
}
