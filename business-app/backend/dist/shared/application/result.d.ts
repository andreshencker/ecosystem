export interface ResultError {
    code: string;
    message: string;
    details?: unknown;
}
export declare class Result<T, E extends ResultError = ResultError> {
    private readonly _isOk;
    private readonly _value?;
    private readonly _error?;
    private constructor();
    static ok<T>(value: T): Result<T, never>;
    static fail<T = never, E extends ResultError = ResultError>(error: E): Result<T, E>;
    get isOk(): boolean;
    get isFail(): boolean;
    get value(): T;
    get error(): E;
    map<U>(fn: (value: T) => U): Result<U, E>;
    getOrElse(fallback: T): T;
}
