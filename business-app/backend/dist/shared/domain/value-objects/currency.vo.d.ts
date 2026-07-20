import { ValueObject } from './value-object.base';
interface CurrencyProps {
    code: string;
}
export declare class Currency extends ValueObject<CurrencyProps> {
    private constructor();
    static of(code: string): Currency;
    get code(): string;
    toString(): string;
}
export {};
