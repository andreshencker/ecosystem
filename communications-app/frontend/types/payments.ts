// ─── Provider Capabilities ────────────────────────────────────────────────────

export type ProviderCapabilityStatus = 'available' | 'planned' | 'unsupported';

export interface ProviderCapabilitiesResponse {
  providerKey: string;
  displayName: string;
  capabilities: Partial<Record<string, ProviderCapabilityStatus>>;
}

// ─── Payment Provider Option ──────────────────────────────────────────────────
//
// Represents one active payment provider configured for the company.
// Sourced from CompanyChannelProvider (payment channel, active, populated).

export interface PaymentProviderOption {
  /** CompanyChannelProvider._id — used as the primary selection key. */
  ccpId: string;
  /** Provider._id from the catalog. */
  providerId: string;
  /** Stable provider key (e.g. 'stripe'). */
  providerKey: string;
  /** Human-readable name from the provider catalog (e.g. 'Stripe'). */
  displayName: string;
  isActive: boolean;
}

// ─── Payment Accounts ─────────────────────────────────────────────────────────

export type PaymentAccountStatus =
  | 'active'
  | 'restricted'
  | 'pending'
  | 'disconnected';

export type PaymentEnvironment = 'test' | 'live';

export interface PaymentAccountCapability {
  name: string;
  status: 'active' | 'inactive' | 'pending' | 'restricted' | 'unsupported';
  configurable: boolean;
  reason?: string;
}

/** Local summary returned by GET /payments/accounts (no live provider call). */
export interface PaymentAccountSummary {
  id: string;
  providerKey: string;
  connectionType: string;
  tag: string;
  displayIdentifier?: string;
  isActive: boolean;
  connectedAt: string | null;
  /** Derived from displayIdentifier prefix: pk_test_ → test, pk_live_ → live */
  environment: 'test' | 'live' | null;
}

export interface PaymentAccountsListResponse {
  data: PaymentAccountSummary[];
  total: number;
  limit: number;
  offset: number;
}

/** Full account detail returned by GET /payments/accounts/:id (live provider call). */
export interface PaymentAccount {
  id: string;
  providerKey: string;
  environment: PaymentEnvironment | null;
  displayName: string | null;
  country: string | null;
  defaultCurrency: string | null;
  status: PaymentAccountStatus;
  capabilities: PaymentAccountCapability[];
  connectedAt: string | null;
  verifiedAt: string | null;
}

// ─── Balance ──────────────────────────────────────────────────────────────────

export type BalanceSourceType = 'card' | 'bank_transfer' | 'other';

export interface PaymentBalanceLine {
  amountMinor: number;
  currency: string;
  sourceType: BalanceSourceType;
}

export interface PaymentBalance {
  accountId: string;
  available: PaymentBalanceLine[];
  pending: PaymentBalanceLine[];
  reserved: PaymentBalanceLine[];
  retrievedAt: string;
}

export interface PaymentAccountVerificationResult {
  accountId: string;
  providerKey: string;
  valid: boolean;
  status: PaymentAccountStatus;
  verifiedAt: string;
  message?: string;
}

// ─── Payment Method Type ──────────────────────────────────────────────────────

export type PaymentMethodType =
  | 'card'
  | 'bank_transfer'
  | 'wallet'
  | 'buy_now_pay_later'
  | 'voucher'
  | 'direct_debit'
  | 'crypto'
  | 'other';

// ─── Payment Method Configuration ─────────────────────────────────────────────

export type PaymentMethodConfigurationStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'restricted'
  | 'unsupported';

export interface PaymentMethodConfiguration {
  id: string;
  accountId: string;
  type: PaymentMethodType;
  displayName: string;
  available: boolean;
  enabled: boolean;
  configurable: boolean;
  status: PaymentMethodConfigurationStatus;
  reason: string | null;
  supportedCurrencies: string[];
  supportedCountries: string[];
}

export interface PaymentMethodConfigurationsListResponse {
  data: PaymentMethodConfiguration[];
  total: number;
}

export interface UpdatePaymentMethodInput {
  enabled: boolean;
}

// ─── Payment Testing ──────────────────────────────────────────────────────────

export type PaymentTestScenario =
  | 'success'
  | 'card_declined'
  | 'insufficient_funds'
  | 'authentication_required'
  | 'processing_error';

export type PaymentTestStatus =
  | 'succeeded'
  | 'failed'
  | 'requires_action'
  | 'processing'
  | 'cancelled';

export interface PaymentTestResult {
  providerKey: string;
  connectionId: string;
  environment: 'test' | 'live';
  testId: string;
  providerPaymentId?: string;
  paymentMethod: string;
  amountMinor: number;
  currency: string;
  status: PaymentTestStatus;
  /** Scenario may be undefined for providers without discrete scenarios (e.g. CoinGate). */
  scenario?: PaymentTestScenario;
  requiresUserAction: boolean;
  /** CoinGate sandbox payment URL — open in browser to simulate payment. */
  paymentUrl?: string;
  failureCode?: string;
  failureMessage?: string;
  createdAt: string;
}

export interface CreatePaymentTestInput {
  connectionId: string;
  /** Required for Stripe; not needed for CoinGate. */
  paymentMethodKey?: string;
  amountMinor: number;
  /** ISO 4217 currency code or provider asset code. */
  currency?: string;
  /**
   * Provider payment unit code — uppercase (e.g. 'EUR', 'BTC').
   * Takes precedence over currency when both are supplied.
   * Used for CoinGate price_currency.
   */
  paymentUnitCode?: string;
  /** Required for Stripe; not needed for CoinGate (sandbox always runs success). */
  scenario?: PaymentTestScenario;
  description?: string;
  reference?: string;
  /** Provider-specific extension fields; never contains credentials. */
  providerExtensions?: Record<string, unknown>;
}

// ─── Payments list ────────────────────────────────────────────────────────────

export type PaymentCanonicalStatus =
  | 'succeeded'
  | 'failed'
  | 'processing'
  | 'pending'
  | 'requires_action'
  | 'requires_confirmation'
  | 'requires_capture'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded';

export interface PaymentSummary {
  id: string;
  accountId: string;
  providerKey: string;
  providerPaymentId: string;
  amountMinor: number;
  currency: string;
  status: PaymentCanonicalStatus;
  providerStatus: string;
  paymentMethodType?: string;
  paymentMethodLabel?: string;
  description?: string;
  createdAt: string;
  requiresUserAction: boolean;
  failureCode?: string;
  declineCode?: string;
  failureMessage?: string;
  /**
   * Safe canonical URL for completing or viewing the payment.
   * Populated by CoinGate (order payment page). Never a credential.
   * Action type 'open_url' uses this field; hidden when absent/falsy.
   */
  paymentUrl?: string;
}

export interface PaymentDetail extends PaymentSummary {
  captureMethod?: string;
  confirmationMethod?: string;
  amountReceivedMinor?: number;
  amountCapturableMinor?: number;
  amountRefundedMinor?: number;
  latestChargeId?: string;
  receiptUrl?: string;
  cancellationReason?: string;
  providerMetadata?: Record<string, string>;
}

export interface PaymentListResult {
  data: PaymentSummary[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ListPaymentsParams {
  cursor?: string;
  limit?: number;
  status?: PaymentCanonicalStatus | '';
  currency?: string;
  createdFrom?: string;
  createdTo?: string;
  search?: string;
}

// ─── Payment units (currencies / assets) ─────────────────────────────────────
//
// Provider-agnostic unit contract. Codes are uppercase (e.g. 'AUD', 'BTC').
// Consumers must never assume fiat-only or hardcode a list of codes.

export type PaymentUnitKind = 'fiat' | 'crypto' | 'token' | 'unknown';

export interface PaymentUnit {
  /** Uppercase canonical code (e.g. 'AUD', 'BTC', 'USDT'). */
  code: string;
  /** Human-readable label returned by the provider adapter. */
  label: string;
  /** Category of the asset. */
  kind: PaymentUnitKind;
  symbol?: string;
  network?: string;
  providerMetadata?: Record<string, unknown>;
}

export interface PaymentUnitsResponse {
  data: PaymentUnit[];
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export type RefundCanonicalStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'requires_action'
  | 'unknown';

export type RefundCanonicalReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer'
  | 'expired_uncaptured_charge'
  | 'other';

export interface RefundSummary {
  id: string;
  accountId: string;
  providerKey: string;
  providerRefundId: string;
  providerPaymentId: string;
  providerChargeId?: string;
  amountMinor: number;
  currency: string;
  status: RefundCanonicalStatus;
  providerStatus: string;
  reason?: string;
  failureCode?: string;
  failureMessage?: string;
  /** ISO string in HTTP transport */
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface RefundDetail extends RefundSummary {
  paymentAmountMinor?: number;
  refundedAmountMinor?: number;
  remainingRefundableAmountMinor?: number;
  receiptNumber?: string;
  balanceTransactionId?: string;
  providerRequestId?: string;
  providerMetadata?: Record<string, string>;
}

export interface RefundListResult {
  data: RefundSummary[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ListRefundsParams {
  cursor?: string;
  limit?: number;
  currency?: string;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface CreateRefundInput {
  paymentId: string;
  amountMinor?: number;
  reason?: RefundCanonicalReason | '';
  metadata?: Record<string, string>;
  /** Provider-specific fields; never contains credentials. */
  providerExtensions?: Record<string, unknown>;
}

// ─── Payouts ──────────────────────────────────────────────────────────────────
//
// Provider-centric payout types. No local persistence.
// A payout represents funds sent from the provider balance to an external
// destination (e.g. bank account). Codes / amounts follow the same
// conventions as PaymentSummary (lowercase currency, integer minor units).

export type PayoutCanonicalStatus =
  | 'pending'
  | 'in_transit'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'reversed'
  | 'unknown';

export type PayoutDestinationType = 'bank_account' | 'debit_card' | 'unknown';

export interface PayoutSummary {
  id: string;
  accountId: string;
  providerKey: string;
  providerPayoutId: string;
  amountMinor: number;
  currency: string;
  status: PayoutCanonicalStatus;
  providerStatus: string;
  method?: string;
  type?: string;
  destinationType?: PayoutDestinationType;
  /** Masked destination label, e.g. "STRIPE TEST BANK •••• 6789". */
  destinationLabel?: string;
  createdAt: string;             // ISO string in HTTP transport
  estimatedArrivalAt?: string;   // ISO string in HTTP transport
  automatic?: boolean;
  description?: string;
  failureCode?: string;
  failureMessage?: string;
  metadata?: Record<string, string>;
}

export interface PayoutDetail extends PayoutSummary {
  balanceTransactionId?: string;
  destinationId?: string;
  destinationBankName?: string;
  destinationLast4?: string;
  statementDescriptor?: string;
  sourceType?: string;
  reconciliationStatus?: string;
  failureBalanceTransactionId?: string;
  providerRequestId?: string;
  providerMetadata?: Record<string, string>;
}

export interface PayoutListResult {
  data: PayoutSummary[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ListPayoutsParams {
  cursor?: string;
  limit?: number;
  status?: string;
  currency?: string;
  createdFrom?: string;
  createdTo?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  search?: string;
}

// ─── Webhook Endpoints ────────────────────────────────────────────────────────

export type WebhookEndpointStatus = 'enabled' | 'disabled' | 'unknown';

export interface WebhookEndpointSummary {
  id: string;
  accountId: string;
  providerKey: string;
  providerEndpointId: string;
  url: string;
  status: WebhookEndpointStatus;
  providerStatus: string;
  enabledEventCount: number;
  apiVersion?: string;
  description?: string;
  createdAt: string;            // ISO string from controller
  environment?: 'test' | 'live';
  metadata?: Record<string, string>;
}

export interface WebhookEndpointDetail extends WebhookEndpointSummary {
  enabledEvents: string[];
  connect?: boolean;
  applicationId?: string;
  providerMetadata?: Record<string, string>;
}

export interface WebhookEndpointCreateResult extends WebhookEndpointDetail {
  /** Present only at creation time. Never returned again. */
  signingSecretOnce?: string;
}

export interface WebhookEndpointListResult {
  data: WebhookEndpointSummary[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface CreateWebhookEndpointInput {
  url: string;
  enabledEvents: string[];
  description?: string;
  connect?: boolean;
}

export interface UpdateWebhookEndpointInput {
  url?: string;
  enabledEvents?: string[];
  description?: string;
  disabled?: boolean;
}

// ─── Webhook Deliveries ───────────────────────────────────────────────────────

export type WebhookSignatureStatus =
  | 'valid'
  | 'invalid'
  | 'missing'
  | 'not_supported'
  | 'unknown';

export type WebhookProcessingStatus =
  | 'received'
  | 'verified'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'ignored'
  | 'duplicate';

export interface WebhookDeliverySummary {
  id: string;
  provider: string;
  connectionId: string;
  providerEventId: string;
  eventType: string;
  objectType?: string;
  objectId?: string;
  processingStatus: WebhookProcessingStatus;
  signatureStatus: WebhookSignatureStatus;
  duplicate: boolean;
  receivedAt: string;           // ISO string
  processedAt?: string;         // ISO string
  attemptCount: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
}

export interface WebhookDeliveryDetail extends WebhookDeliverySummary {
  providerApiVersion?: string;
  livemode?: boolean;
  requestId?: string;
  payloadHash?: string;
  safePayloadSummary?: Record<string, unknown>;
  rawPayloadAvailable: boolean;
  processingStartedAt?: string;
  processingCompletedAt?: string;
}

export interface WebhookDeliveryListResult {
  data: WebhookDeliverySummary[];
  hasMore: boolean;
  total: number;
}

export interface ListWebhookDeliveriesParams {
  limit?: number;
  offset?: number;
  eventType?: string;
  processingStatus?: string;
  signatureStatus?: string;
  duplicate?: boolean;
  receivedFrom?: string;
  receivedTo?: string;
  search?: string;
}

// ─── Gateway Guide ────────────────────────────────────────────────────────────

export interface GatewayGuideStep {
  stepNumber: number;
  title: string;
  description: string;
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
  mode: string;
  label: string;
  description: string;
  recommendedFor: string[];
  supported: boolean;
}

export interface GatewayGuide {
  providerKey: string;
  displayName: string;
  description: string;
  prerequisites: string[];
  supportedFlows: string[];
  implementationSteps: GatewayGuideStep[];
  requestExamples: GatewayGuideRequestExample[];
  responseExamples: GatewayGuideResponseExample[];
  presentationTypes: GatewayGuidePresentationType[];
  testingInstructions: string[];
  limitations: string[];
  webhookReceiverPath: string;
}

// ─── Payments Page Definition ─────────────────────────────────────────────────
//
// Canonical definition returned by GET /payments/connections/:id/page-definition.
// Drives all UI components on the Payments list page — no provider branching in the
// generic frontend. Never contains credentials, tokens, or executable code.

export type SummaryCardSource =
  | 'balance.available'
  | 'balance.pending'
  | 'page.status'
  | 'aggregate.status'
  | 'provider.metric';

export type SummaryCardScope = 'connection' | 'filtered_result' | 'current_page';

export type SummaryCardUnavailableBehaviour = 'hide' | 'not_supported' | 'unavailable';

export interface PaymentSummaryCardDefinition {
  key: string;
  label: string;
  type: 'amount' | 'count' | 'text';
  source: SummaryCardSource;
  status?: PaymentCanonicalStatus;
  capability?: string;
  scope: SummaryCardScope;
  unavailableBehaviour: SummaryCardUnavailableBehaviour;
  format?: { currencySource?: string; decimals?: number };
}

export type FilterType = 'search' | 'select' | 'multi_select' | 'date' | 'date_range';

export type FilterOptionsSource =
  | 'payment_units'
  | 'payment_statuses'
  | 'payment_methods'
  | 'provider';

export interface PaymentFilterDefinition {
  key: string;
  label: string;
  type: FilterType;
  queryParam: string;
  capability?: string;
  optionsSource?: FilterOptionsSource;
  placeholder?: string;
  resetOnProviderChange: boolean;
  resetOnConnectionChange: boolean;
}

export type ColumnType =
  | 'identifier'
  | 'amount'
  | 'payment_unit'
  | 'method'
  | 'status'
  | 'date'
  | 'text'
  | 'actions';

export interface PaymentColumnDefinition {
  key: string;
  label: string;
  type: ColumnType;
  field?: string;
  secondaryField?: string;
  capability?: string;
  width?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  hiddenWhenEmpty?: boolean;
}

export type ActionType = 'view' | 'open_url' | 'refund' | 'cancel' | 'capture';

export interface PaymentActionDefinition {
  key: string;
  label: string;
  type: ActionType;
  capability?: string;
  field?: string;
  confirmationRequired?: boolean;
  permission?: string;
}

export interface PaymentsPageDefinition {
  providerKey: string;
  connectionId: string;
  version: string;
  capabilities: Partial<Record<string, ProviderCapabilityStatus>>;
  summaryCards: PaymentSummaryCardDefinition[];
  filters: PaymentFilterDefinition[];
  columns: PaymentColumnDefinition[];
  rowActions: PaymentActionDefinition[];
  list: {
    supported: boolean;
    defaultPageSize: number;
    allowedPageSizes: number[];
    paginationType: 'cursor' | 'page' | 'none';
    defaultSort?: string;
  };
  emptyState: {
    title: string;
    description: string;
  };
  metadata?: Record<string, unknown>;
}

// ─── Refunds Page Definition ──────────────────────────────────────────────────
//
// Canonical definition returned by
// GET /payments/connections/:id/refunds/page-definition.
// Drives all Refunds page UI components — toolbar actions, filters, columns,
// row actions, and create form. No provider branching in the generic frontend.
// Never contains credentials, tokens, or executable code.

export type RefundToolbarActionType = 'refresh' | 'create_refund';

export interface RefundToolbarActionDefinition {
  key: string;
  label: string;
  type: RefundToolbarActionType;
  capability?: string;
  permission?: string;
  disabledReason?: string;
}

export type RefundFilterType = 'search' | 'select' | 'date' | 'date_range';

export type RefundFilterOptionsSource =
  | 'refund_statuses'
  | 'payment_units'
  | 'provider';

export interface RefundFilterDefinition {
  key: string;
  label: string;
  type: RefundFilterType;
  queryParam: string;
  capability?: string;
  optionsSource?: RefundFilterOptionsSource;
  placeholder?: string;
  resetOnProviderChange: boolean;
  resetOnConnectionChange: boolean;
}

export type RefundColumnType =
  | 'identifier'
  | 'amount'
  | 'payment_unit'
  | 'reason'
  | 'status'
  | 'date'
  | 'text'
  | 'actions';

export interface RefundColumnDefinition {
  key: string;
  label: string;
  type: RefundColumnType;
  field?: string;
  secondaryField?: string;
  capability?: string;
  width?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  hiddenWhenEmpty?: boolean;
}

export type RefundActionType = 'view';

export interface RefundActionDefinition {
  key: string;
  label: string;
  type: RefundActionType;
  capability?: string;
  permission?: string;
}

export type RefundCreateFieldType =
  | 'payment_reference'
  | 'amount'
  | 'select'
  | 'text'
  | 'email'
  | 'payment_unit';

export interface RefundCreateFieldDefinition {
  key: string;
  label: string;
  type: RefundCreateFieldType;
  required: boolean;
  capability?: string;
  optionsSource?: 'payment_units' | 'refund_reasons' | 'provider';
  placeholder?: string;
  helpText?: string;
  providerExtension?: boolean;
  /**
   * For payment_unit + providerExtension=true fields:
   * maps providerMetadata keys → providerExtensions keys.
   * e.g. { currencyId: 'currency_id', platformId: 'platform_id' }
   */
  providerMetadataMapping?: Record<string, string>;
}

export interface RefundCreateFormDefinition {
  supported: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  fields: RefundCreateFieldDefinition[];
}

export interface RefundsPageDefinition {
  providerKey: string;
  connectionId: string;
  version: string;
  capabilities: Partial<Record<string, ProviderCapabilityStatus>>;
  toolbarActions: RefundToolbarActionDefinition[];
  filters: RefundFilterDefinition[];
  columns: RefundColumnDefinition[];
  rowActions: RefundActionDefinition[];
  createForm?: RefundCreateFormDefinition;
  list: {
    supported: boolean;
    defaultPageSize: number;
    allowedPageSizes: number[];
    paginationType: 'cursor' | 'page' | 'none';
    defaultSort?: string;
  };
  emptyState: {
    title: string;
    description: string;
  };
  metadata?: Record<string, unknown>;
}

// ─── Payment Testing Page Definition ─────────────────────────────────────────
//
// Canonical definition returned by
// GET /payments/connections/:id/testing/page-definition.
// Drives the Payment Testing page UI — form fields, submit label, result
// presentation, instructions. No provider branching in the generic frontend.
// Never contains credentials, tokens, or executable code.

export type PaymentTestingFieldType =
  | 'scenario'
  | 'amount'
  | 'payment_unit'
  | 'text'
  | 'email'
  | 'select';

export type PaymentTestingFieldOptionsSource =
  | 'test_scenarios'
  | 'payment_units'
  | 'provider';

export interface PaymentTestingFieldDefinition {
  key: string;
  label: string;
  type: PaymentTestingFieldType;
  required: boolean;
  capability?: string;
  optionsSource?: PaymentTestingFieldOptionsSource;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number;
  providerExtension?: boolean;
}

export interface PaymentTestingFormDefinition {
  supported: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  fields: PaymentTestingFieldDefinition[];
}

export interface PaymentTestingResultDefinition {
  presentationType: 'redirect' | 'embedded' | 'none';
  successTitle?: string;
  successDescription?: string;
}

export interface PaymentTestingPageDefinition {
  providerKey: string;
  connectionId: string;
  environment: 'test' | 'live' | 'unknown';
  version: string;
  capabilities: Partial<Record<string, ProviderCapabilityStatus>>;
  form: PaymentTestingFormDefinition;
  result: PaymentTestingResultDefinition;
  instructions?: string[];
  limitations?: string[];
  metadata?: Record<string, unknown>;
}
