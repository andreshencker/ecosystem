import { DomainError } from '../domain/errors/domain-error.base';
export declare class ApplicationError extends DomainError {
    readonly code: string;
    constructor(code: string, message: string, details?: unknown);
}
