// src/payments/providers/stripe/stripe.payment-methods.ts
//
// Stripe-specific helpers for PaymentMethodConfiguration.
// All Stripe SDK types stay within src/payments/providers/stripe/.

import type Stripe from 'stripe';
import type { PaymentMethodConfiguration } from '../../contracts/payment-method-configuration.contract';
import { PaymentMethodConfigurationStatus } from '../../enums/payment-method-configuration-status.enum';
import { PaymentMethodType } from '../../enums/payment-method-type.enum';

// ─── Internal shape ───────────────────────────────────────────────────────────

export interface StripeMethodData {
  available: boolean;
  display_preference: {
    preference: string;
    value: string;
    overridable: boolean | null;
  };
}

export interface StripeMethodEntry {
  key: string;
  data: StripeMethodData;
}

// ─── Known Stripe PMC field keys ─────────────────────────────────────────────
// These are the keys that can appear on a PaymentMethodConfiguration object.

export const KNOWN_STRIPE_METHOD_KEYS: readonly string[] = [
  'acss_debit',
  'affirm',
  'afterpay_clearpay',
  'alipay',
  'alma',
  'amazon_pay',
  'apple_pay',
  'au_becs_debit',
  'bacs_debit',
  'bancontact',
  'billie',
  'blik',
  'boleto',
  'card',
  'cartes_bancaires',
  'cashapp',
  'crypto',
  'customer_balance',
  'eps',
  'fpx',
  'giropay',
  'google_pay',
  'grabpay',
  'ideal',
  'jcb',
  'kakao_pay',
  'klarna',
  'konbini',
  'kr_card',
  'link',
  'mb_way',
  'mobilepay',
  'multibanco',
  'naver_pay',
  'nz_bank_account',
  'oxxo',
  'p24',
  'pay_by_bank',
  'payco',
  'paynow',
  'paypal',
  'payto',
  'pix',
  'promptpay',
  'revolut_pay',
  'samsung_pay',
  'satispay',
  'scalapay',
  'sepa_debit',
  'sofort',
  'sunbit',
  'swish',
  'twint',
  'upi',
  'us_bank_account',
  'wechat_pay',
  'zip',
];

// ─── Display name map ─────────────────────────────────────────────────────────

const DISPLAY_NAMES: Record<string, string> = {
  card: 'Credit & Debit Cards',
  cartes_bancaires: 'Cartes Bancaires',
  jcb: 'JCB',
  kr_card: 'Korean Cards',
  us_bank_account: 'US Bank Transfer (ACH)',
  customer_balance: 'Customer Balance Transfer',
  ideal: 'iDEAL',
  bancontact: 'Bancontact',
  eps: 'EPS',
  giropay: 'Giropay',
  p24: 'Przelewy24',
  multibanco: 'Multibanco',
  sofort: 'Sofort',
  blik: 'BLIK',
  fpx: 'FPX',
  payto: 'PayTo',
  nz_bank_account: 'NZ Bank Transfer (BECS)',
  pay_by_bank: 'Pay by Bank',
  sepa_debit: 'SEPA Direct Debit',
  acss_debit: 'Canadian ACSS Debit',
  au_becs_debit: 'Australian BECS Debit',
  bacs_debit: 'UK Bacs Direct Debit',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  cashapp: 'Cash App Pay',
  link: 'Link by Stripe',
  amazon_pay: 'Amazon Pay',
  samsung_pay: 'Samsung Pay',
  kakao_pay: 'Kakao Pay',
  naver_pay: 'Naver Pay',
  payco: 'PAYCO',
  mb_way: 'MB WAY',
  revolut_pay: 'Revolut Pay',
  wechat_pay: 'WeChat Pay',
  alipay: 'Alipay',
  grabpay: 'GrabPay',
  mobilepay: 'MobilePay',
  swish: 'Swish',
  paynow: 'PayNow',
  pix: 'Pix',
  promptpay: 'PromptPay',
  upi: 'UPI',
  twint: 'TWINT',
  paypal: 'PayPal',
  klarna: 'Klarna',
  afterpay_clearpay: 'Afterpay / Clearpay',
  affirm: 'Affirm',
  alma: 'Alma',
  scalapay: 'Scalapay',
  sunbit: 'Sunbit',
  billie: 'Billie',
  zip: 'Zip',
  boleto: 'Boleto',
  konbini: 'Konbini',
  oxxo: 'OXXO',
  crypto: 'Stablecoin / Crypto',
  satispay: 'Satispay',
};

// ─── Canonical type map ───────────────────────────────────────────────────────

const TYPE_MAP: Record<string, PaymentMethodType> = {
  card: PaymentMethodType.Card,
  cartes_bancaires: PaymentMethodType.Card,
  jcb: PaymentMethodType.Card,
  kr_card: PaymentMethodType.Card,

  us_bank_account: PaymentMethodType.BankTransfer,
  customer_balance: PaymentMethodType.BankTransfer,
  ideal: PaymentMethodType.BankTransfer,
  bancontact: PaymentMethodType.BankTransfer,
  eps: PaymentMethodType.BankTransfer,
  giropay: PaymentMethodType.BankTransfer,
  p24: PaymentMethodType.BankTransfer,
  multibanco: PaymentMethodType.BankTransfer,
  sofort: PaymentMethodType.BankTransfer,
  blik: PaymentMethodType.BankTransfer,
  fpx: PaymentMethodType.BankTransfer,
  payto: PaymentMethodType.BankTransfer,
  nz_bank_account: PaymentMethodType.BankTransfer,
  pay_by_bank: PaymentMethodType.BankTransfer,

  sepa_debit: PaymentMethodType.DirectDebit,
  acss_debit: PaymentMethodType.DirectDebit,
  au_becs_debit: PaymentMethodType.DirectDebit,
  bacs_debit: PaymentMethodType.DirectDebit,

  apple_pay: PaymentMethodType.Wallet,
  google_pay: PaymentMethodType.Wallet,
  cashapp: PaymentMethodType.Wallet,
  link: PaymentMethodType.Wallet,
  amazon_pay: PaymentMethodType.Wallet,
  samsung_pay: PaymentMethodType.Wallet,
  kakao_pay: PaymentMethodType.Wallet,
  naver_pay: PaymentMethodType.Wallet,
  payco: PaymentMethodType.Wallet,
  mb_way: PaymentMethodType.Wallet,
  revolut_pay: PaymentMethodType.Wallet,
  wechat_pay: PaymentMethodType.Wallet,
  alipay: PaymentMethodType.Wallet,
  grabpay: PaymentMethodType.Wallet,
  mobilepay: PaymentMethodType.Wallet,
  swish: PaymentMethodType.Wallet,
  paynow: PaymentMethodType.Wallet,
  pix: PaymentMethodType.Wallet,
  promptpay: PaymentMethodType.Wallet,
  upi: PaymentMethodType.Wallet,
  twint: PaymentMethodType.Wallet,
  paypal: PaymentMethodType.Wallet,

  klarna: PaymentMethodType.BuyNowPayLater,
  afterpay_clearpay: PaymentMethodType.BuyNowPayLater,
  affirm: PaymentMethodType.BuyNowPayLater,
  alma: PaymentMethodType.BuyNowPayLater,
  scalapay: PaymentMethodType.BuyNowPayLater,
  sunbit: PaymentMethodType.BuyNowPayLater,
  billie: PaymentMethodType.BuyNowPayLater,
  zip: PaymentMethodType.BuyNowPayLater,

  boleto: PaymentMethodType.Voucher,
  konbini: PaymentMethodType.Voucher,
  oxxo: PaymentMethodType.Voucher,

  crypto: PaymentMethodType.Crypto,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveDisplayName(key: string): string {
  if (key in DISPLAY_NAMES) return DISPLAY_NAMES[key];
  // Default: capitalize and replace underscores with spaces
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveCanonicalType(key: string): PaymentMethodType {
  return TYPE_MAP[key] ?? PaymentMethodType.Other;
}

// ─── Status mapping ───────────────────────────────────────────────────────────
//
// Stripe's `available` field means "currently offered at checkout":
//   true  = display_preference.value is 'on' AND account capability is active
//   false = not currently being offered (disabled OR capability not active)
//
// This does NOT mean "permanently unsupported". A disabled method (preference='off'
// or 'none') has available=false but CAN be enabled by setting preference='on'.
//
// The only truly non-configurable case is overridable=false (Connect child config
// cannot override its parent's setting).

export function mapStripeMethodStatus(
  available: boolean,
  value: string,
  _preference: string,
  overridable: boolean | null,
): PaymentMethodConfigurationStatus {
  // Cannot be managed in this configuration — parent config controls this entry.
  // Only applies to Connect child configurations (overridable=false).
  if (overridable === false)
    return PaymentMethodConfigurationStatus.Unsupported;

  // Currently active and being offered at checkout.
  // Per Stripe docs, available=true iff value='on' AND capability is active.
  // Both conditions are checked defensively in case of inconsistent responses.
  if (available && value === 'on')
    return PaymentMethodConfigurationStatus.Active;

  // Preference is 'on' but account capability is not active → restricted.
  // Operator wants it enabled but the Stripe account capability prevents it.
  if (value === 'on' && !available)
    return PaymentMethodConfigurationStatus.Restricted;

  // Not currently offered but can be enabled by changing the preference.
  return PaymentMethodConfigurationStatus.Inactive;
}

// ─── Entry extraction ─────────────────────────────────────────────────────────

export function extractStripeMethodEntries(
  config: Stripe.PaymentMethodConfiguration,
): StripeMethodEntry[] {
  const raw = config as unknown as Record<
    string,
    | {
        available: boolean;
        display_preference: {
          preference: string;
          value: string;
          overridable: boolean | null;
        };
      }
    | undefined
  >;

  const entries: StripeMethodEntry[] = [];

  for (const key of KNOWN_STRIPE_METHOD_KEYS) {
    const field = raw[key];
    if (
      field &&
      typeof field === 'object' &&
      'available' in field &&
      'display_preference' in field
    ) {
      entries.push({ key, data: field as StripeMethodData });
    }
  }

  return entries;
}

// ─── Canonical mapping ────────────────────────────────────────────────────────

export function mapStripeMethodToCanonical(
  key: string,
  data: StripeMethodData,
  accountId: string,
): PaymentMethodConfiguration {
  const { available, display_preference: dp } = data;
  const status = mapStripeMethodStatus(
    available,
    dp.value,
    dp.preference,
    dp.overridable,
  );
  const enabled = dp.value === 'on' && available;
  // A method is configurable when we can change its display_preference.
  // This does NOT depend on whether it is currently available at checkout.
  // overridable=false only occurs in Connect child configurations where the
  // parent configuration's setting cannot be overridden.
  const configurable = dp.overridable !== false;

  return {
    id: key,
    accountId,
    type: resolveCanonicalType(key),
    displayName: resolveDisplayName(key),
    available,
    enabled,
    configurable,
    status,
    reason: null,
    supportedCurrencies: [],
    supportedCountries: [],
  };
}

// ─── Update params builder ────────────────────────────────────────────────────

export function buildStripeUpdateParams(
  methodId: string,
  enabled: boolean,
): Record<string, { display_preference: { preference: 'on' | 'off' } }> {
  return {
    [methodId]: {
      display_preference: {
        preference: enabled ? 'on' : 'off',
      },
    },
  };
}
