import { ValueObject } from './value-object.base';
interface MoneyProps {
    minorUnits: bigint;
    currency: string;
}
export declare class Money extends ValueObject<MoneyProps> {
    private constructor();
    static of(amount: number, currency: string): Money;
    static ofMinorUnits(minorUnits: bigint, currency: string): Money;
    static zero(currency: string): Money;
    get minorUnits(): bigint;
    get currency(): string;
    get amount(): number;
    toDecimal(): number;
    add(other: Money): Money;
    subtract(other: Money): Money;
    multiply(factor: number): Money;
    compare(other: Money): -1 | 0 | 1;
    isZero(): boolean;
    isPositive(): boolean;
    isNegative(): boolean;
    equals(other: ValueObject<MoneyProps>): boolean;
    private assertSameCurrency;
    toString(): string;
}
export {};
