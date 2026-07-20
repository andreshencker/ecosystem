import { ValueObject } from './value-object.base';
interface LanguageProps {
    code: string;
}
export declare class Language extends ValueObject<LanguageProps> {
    private constructor();
    static of(code: string): Language;
    get code(): string;
    toString(): string;
}
export {};
