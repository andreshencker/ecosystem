// Central map from Payments page to the provider capability key it depends on.
//
// Each page checks exactly one page-level capability before issuing any
// provider API request. If the capability is planned or unsupported, the
// request is never made and ProviderFeatureUnavailable is rendered instead.

export const PAGE_CAPABILITY = {
  dashboard:      'dashboard',
  paymentMethods: 'paymentMethods',
  paymentTesting: 'paymentTesting',
  payments:       'payments',
  refunds:        'refunds',
  payouts:        'payouts',
  webhooks:       'webhooks',
  gateway:        'gateway',
} as const;

export type PageCapabilityKey = keyof typeof PAGE_CAPABILITY;

export const PAGE_FEATURE_DISPLAY_NAME: Record<PageCapabilityKey, string> = {
  dashboard:      'Dashboard',
  paymentMethods: 'Payment Methods',
  paymentTesting: 'Payment Testing',
  payments:       'Payments',
  refunds:        'Refunds',
  payouts:        'Payouts',
  webhooks:       'Webhooks',
  gateway:        'Gateway',
};
