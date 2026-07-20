import { ValueObject } from './value-object.base';
interface TimezoneProps {
    value: string;
}
export declare class Timezone extends ValueObject<TimezoneProps> {
    private constructor();
    static of(value: string): Timezone;
    get value(): string;
    toString(): string;
}
export {};
