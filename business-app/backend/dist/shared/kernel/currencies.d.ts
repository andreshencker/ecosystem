export declare const CURRENCIES: {
    readonly AUD: "AUD";
    readonly USD: "USD";
    readonly EUR: "EUR";
    readonly GBP: "GBP";
    readonly CAD: "CAD";
    readonly NZD: "NZD";
    readonly JPY: "JPY";
    readonly CHF: "CHF";
    readonly CNY: "CNY";
    readonly HKD: "HKD";
    readonly SGD: "SGD";
    readonly INR: "INR";
    readonly BRL: "BRL";
    readonly ARS: "ARS";
    readonly MXN: "MXN";
};
export type CurrencyCode = (typeof CURRENCIES)[keyof typeof CURRENCIES];
