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
export declare class MdmService {
    getCurrencies(): CurrencyEntry[];
    getTaxRates(jurisdiction?: string): TaxRateEntry[];
    getInvoiceStatuses(): InvoiceStatusEntry[];
    getPaymentMethods(): PaymentMethodEntry[];
    getBillingCycles(): BillingCycleEntry[];
}
