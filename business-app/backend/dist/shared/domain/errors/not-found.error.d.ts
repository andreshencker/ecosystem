import { DomainError } from './domain-error.base';
export declare class NotFoundError extends DomainError {
    readonly code: string;
    constructor(resource: string, id: string);
}
