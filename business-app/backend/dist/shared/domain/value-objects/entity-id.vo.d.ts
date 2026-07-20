import { ValueObject } from './value-object.base';
interface EntityIdProps {
    value: string;
}
export declare class EntityId extends ValueObject<EntityIdProps> {
    private constructor();
    static generate(): EntityId;
    static from(value: string): EntityId;
    get value(): string;
    toString(): string;
}
export {};
