import { Address } from '../../domain/value-objects/address.vo';
export declare function createAddress(overrides?: Partial<{
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}>): Address;
