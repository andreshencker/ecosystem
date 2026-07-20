import { ValueObject } from './value-object.base';
interface WebsiteProps {
    value: string;
}
export declare class Website extends ValueObject<WebsiteProps> {
    private constructor();
    static of(value: string): Website;
    get value(): string;
    toString(): string;
}
export {};
