"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MdmService = void 0;
const common_1 = require("@nestjs/common");
const CURRENCIES = [
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
const TAX_RATES = [
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
const INVOICE_STATUSES = [
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
const PAYMENT_METHODS = [
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
const BILLING_CYCLES = [
    { code: 'weekly', label: 'Weekly', daysApprox: 7 },
    { code: 'fortnightly', label: 'Fortnightly', daysApprox: 14 },
    { code: 'monthly', label: 'Monthly', daysApprox: 30 },
    { code: 'quarterly', label: 'Quarterly', daysApprox: 91 },
    { code: 'biannually', label: 'Bi-Annually', daysApprox: 182 },
    { code: 'annually', label: 'Annually', daysApprox: 365 },
];
let MdmService = class MdmService {
    getCurrencies() {
        return CURRENCIES;
    }
    getTaxRates(jurisdiction) {
        if (!jurisdiction)
            return TAX_RATES;
        return TAX_RATES.filter((r) => r.jurisdiction === jurisdiction || r.jurisdiction === '*');
    }
    getInvoiceStatuses() {
        return INVOICE_STATUSES;
    }
    getPaymentMethods() {
        return PAYMENT_METHODS;
    }
    getBillingCycles() {
        return BILLING_CYCLES;
    }
};
exports.MdmService = MdmService;
exports.MdmService = MdmService = __decorate([
    (0, common_1.Injectable)()
], MdmService);
//# sourceMappingURL=mdm.service.js.map