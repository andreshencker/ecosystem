import { DomainError } from './domain-error.base';
export declare class ConflictError extends DomainError {
    readonly code: string;
    constructor(message: string, details?: unknown);
}
