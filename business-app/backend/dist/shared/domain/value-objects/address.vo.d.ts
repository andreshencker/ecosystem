import { ValueObject } from './value-object.base';
interface AddressProps {
    street: string;
    city: string;
    state: string | undefined;
    postalCode: string;
    country: string;
}
export declare class Address extends ValueObject<AddressProps> {
    private constructor();
    static of(props: {
        street: string;
        city: string;
        state?: string;
        postalCode: string;
        country: string;
    }): Address;
    get street(): string;
    get city(): string;
    get state(): string | undefined;
    get postalCode(): string;
    get country(): string;
    toString(): string;
}
export {};
