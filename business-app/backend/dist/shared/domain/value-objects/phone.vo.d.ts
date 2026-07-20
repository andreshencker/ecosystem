import { ValueObject } from './value-object.base';
interface PhoneProps {
    value: string;
    countryCode: string | undefined;
}
export declare class Phone extends ValueObject<PhoneProps> {
    private constructor();
    static of(value: string, countryCode?: string): Phone;
    get value(): string;
    get countryCode(): string | undefined;
    toString(): string;
}
export {};
