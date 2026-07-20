import { ValueObject } from './value-object.base';
interface CorrelationIdProps {
    value: string;
}
export declare class CorrelationId extends ValueObject<CorrelationIdProps> {
    private constructor();
    static generate(): CorrelationId;
    static from(value: string): CorrelationId;
    get value(): string;
    toString(): string;
}
export {};
