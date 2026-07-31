// Public surface of the Stripe provider.
// Only import what is explicitly exported here from outside this folder.
// The Stripe SDK and all Stripe API logic are fully encapsulated inside
// StripePaymentProvider — nothing Stripe-specific is re-exported.

export { StripePaymentProvider } from './stripe.provider';
export { StripeCredentialsContract } from './stripe.credentials.contract';
export type { StripeCredentials } from './stripe.credentials.contract';
export { STRIPE_CAPABILITIES } from './stripe.capabilities';
export {
  STRIPE_PROVIDER_KEY,
  STRIPE_DISPLAY_NAME,
  STRIPE_DESCRIPTION,
  STRIPE_CONNECTION_TYPE,
} from './stripe.constants';
