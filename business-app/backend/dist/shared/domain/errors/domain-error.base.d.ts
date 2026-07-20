export declare abstract class DomainError extends Error {
    abstract readonly code: string;
    readonly details: unknown;
    protected constructor(message: string, details?: unknown);
}
