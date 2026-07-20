import { DomainError } from './domain-error.base';
export declare class ValidationError extends DomainError {
    readonly code: string;
    readonly fields: Record<string, string[]>;
    constructor(message: string, fields?: Record<string, string[]>, details?: unknown);
}
