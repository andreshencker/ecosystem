import { ValueObject } from './value-object.base';
interface EmailProps {
    value: string;
}
export declare class Email extends ValueObject<EmailProps> {
    private constructor();
    static of(value: string): Email;
    get value(): string;
    toString(): string;
}
export {};
