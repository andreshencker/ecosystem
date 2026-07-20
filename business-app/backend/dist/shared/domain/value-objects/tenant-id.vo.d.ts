import { ValueObject } from './value-object.base';
interface TenantIdProps {
    value: string;
}
export declare class TenantId extends ValueObject<TenantIdProps> {
    private constructor();
    static generate(): TenantId;
    static from(value: string): TenantId;
    get value(): string;
    toString(): string;
}
export {};
