import { DomainError } from './domain-error.base';
export declare class BusinessError extends DomainError {
    readonly code: string;
    constructor(code: string, message: string, details?: unknown);
}
