// src/payments/providers/stripe-connect/stripe-connect.credentials.contract.ts
//
// Stripe Connect uses the same credential shape as direct Stripe — a secret
// key, publishable key and mode. The only difference is that this key belongs
// to the *platform* account (the one Connect is enabled on). Re-exported so
// the generic ProviderCredentialsService can resolve it by providerKey.

export {
  StripeCredentialsContract as StripeConnectCredentialsContract,
  type StripeCredentials as StripeConnectCredentials,
} from '../stripe/stripe.credentials.contract';
