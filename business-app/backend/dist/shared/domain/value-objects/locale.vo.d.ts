import { ValueObject } from './value-object.base';
interface LocaleProps {
    value: string;
}
export declare class Locale extends ValueObject<LocaleProps> {
    private constructor();
    static of(value: string): Locale;
    get value(): string;
    toString(): string;
}
export {};
