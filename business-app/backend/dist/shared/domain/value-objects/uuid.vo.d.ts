import { ValueObject } from './value-object.base';
interface UUIDProps {
    value: string;
}
export declare class UUID extends ValueObject<UUIDProps> {
    protected constructor(props: UUIDProps);
    static generate(): UUID;
    static from(value: string): UUID;
    static isValid(value: string): boolean;
    get value(): string;
    toString(): string;
}
export {};
