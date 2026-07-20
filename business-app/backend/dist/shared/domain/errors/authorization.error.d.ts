import { DomainError } from './domain-error.base';
export declare class AuthorizationError extends DomainError {
    readonly code: string;
    constructor(message?: string, details?: unknown);
}
