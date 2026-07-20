import { Injectable } from '@nestjs/common';

// ─── Catalog types ────────────────────────────────────────────────────────────

export interface CurrencyEntry {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}
export interface TaxRateEntry {
  code: string;
  name: string;
  rate: number;
  jurisdiction: string;
  description: string;
}
export interface InvoiceStatusEntry {
  code: string;
  label: string;
  terminal: boolean;
}
export interface PaymentMethodEntry {
  code: string;
  label: string;
}
export interface BillingCycleEntry {
  code: string;
  label: string;
  daysApprox: number;
}

// ─── Static catalog data ──────────────────────────────────────────────────────
// MDM catalogs are modules-level. Only platform_admin can modify them (BR-MDM-002).
// For Sprint 2, catalogs are hardcoded. Sprint 8+ can add DB backing and admin CRUD.

const CURRENCIES: CurrencyEntry[] = [
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', decimals: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: '$', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
];

const TAX_RATES: TaxRateEntry[] = [
  {
    code: 'AU_GST',
    name: 'GST',
    rate: 10,
    jurisdiction: 'AU',
    description: 'Goods and Services Tax — standard rate.',
  },
  {
    code: 'AU_GST_FREE',
    name: 'GST-Free',
    rate: 0,
    jurisdiction: 'AU',
    description: 'Goods and services exempt from GST.',
  },
  {
    code: 'AU_INPUT_TAXED',
    name: 'Input Taxed',
    rate: 0,
    jurisdiction: 'AU',
    description: 'Financial supplies and residential rent.',
  },
  {
    code: 'AU_CAPITAL',
    name: 'Capital (GST)',
    rate: 10,
    jurisdiction: 'AU',
    description: 'Capital acquisitions with full GST credits.',
  },
  {
    code: 'AU_EXPORT',
    name: 'GST-Free Export',
    rate: 0,
    jurisdiction: 'AU',
    description: 'Exports of goods and services from Australia.',
  },
  {
    code: 'NONE',
    name: 'No Tax',
    rate: 0,
    jurisdiction: '*',
    description: 'No tax applicable.',
  },
];

const INVOICE_STATUSES: InvoiceStatusEntry[] = [
  { code: 'draft', label: 'Draft', terminal: false },
  { code: 'approved', label: 'Approved', terminal: false },
  { code: 'sent', label: 'Sent', terminal: false },
  { code: 'viewed', label: 'Viewed', terminal: false },
  { code: 'partial', label: 'Partial', terminal: false },
  { code: 'paid', label: 'Paid', terminal: true },
  { code: 'overdue', label: 'Overdue', terminal: false },
  { code: 'void', label: 'Void', terminal: true },
  { code: 'cancelled', label: 'Cancelled', terminal: true },
];

const PAYMENT_METHODS: PaymentMethodEntry[] = [
  { code: 'bank_transfer', label: 'Bank Transfer' },
  { code: 'credit_card', label: 'Credit Card' },
  { code: 'debit_card', label: 'Debit Card' },
  { code: 'cash', label: 'Cash' },
  { code: 'cheque', label: 'Cheque' },
  { code: 'direct_debit', label: 'Direct Debit' },
  { code: 'bpay', label: 'BPAY' },
  { code: 'paypal', label: 'PayPal' },
  { code: 'stripe', label: 'Stripe' },
  { code: 'other', label: 'Other' },
];

const BILLING_CYCLES: BillingCycleEntry[] = [
  { code: 'weekly', label: 'Weekly', daysApprox: 7 },
  { code: 'fortnightly', label: 'Fortnightly', daysApprox: 14 },
  { code: 'monthly', label: 'Monthly', daysApprox: 30 },
  { code: 'quarterly', label: 'Quarterly', daysApprox: 91 },
  { code: 'biannually', label: 'Bi-Annually', daysApprox: 182 },
  { code: 'annually', label: 'Annually', daysApprox: 365 },
];

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MdmService {
  getCurrencies(): CurrencyEntry[] {
    return CURRENCIES;
  }
  getTaxRates(jurisdiction?: string): TaxRateEntry[] {
    if (!jurisdiction) return TAX_RATES;
    return TAX_RATES.filter(
      (r) => r.jurisdiction === jurisdiction || r.jurisdiction === '*',
    );
  }
  getInvoiceStatuses(): InvoiceStatusEntry[] {
    return INVOICE_STATUSES;
  }
  getPaymentMethods(): PaymentMethodEntry[] {
    return PAYMENT_METHODS;
  }
  getBillingCycles(): BillingCycleEntry[] {
    return BILLING_CYCLES;
  }
}
