import { ValueObject } from './value-object.base';
interface PercentageProps {
    value: number;
}
export declare class Percentage extends ValueObject<PercentageProps> {
    private constructor();
    static of(value: number): Percentage;
    get value(): number;
    toDecimal(): number;
    toString(): string;
}
export {};
