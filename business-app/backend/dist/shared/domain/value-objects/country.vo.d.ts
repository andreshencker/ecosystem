import { ValueObject } from './value-object.base';
interface CountryProps {
    code: string;
}
export declare class Country extends ValueObject<CountryProps> {
    private constructor();
    static of(code: string): Country;
    get code(): string;
    toString(): string;
}
export {};
