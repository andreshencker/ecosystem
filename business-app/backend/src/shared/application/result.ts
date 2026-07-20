export interface ResultError {
  code: string;
  message: string;
  details?: unknown;
}

export class Result<T, E extends ResultError = ResultError> {
  private constructor(
    private readonly _isOk: boolean,
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>(true, value);
  }

  static fail<T = never, E extends ResultError = ResultError>(
    error: E,
  ): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  get isOk(): boolean {
    return this._isOk;
  }

  get isFail(): boolean {
    return !this._isOk;
  }

  get value(): T {
    if (!this._isOk) throw new Error('Cannot get value from a failed Result');
    return this._value as T;
  }

  get error(): E {
    if (this._isOk)
      throw new Error('Cannot get error from a successful Result');
    return this._error as E;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isOk) return Result.ok(fn(this._value as T));
    return Result.fail(this._error as E);
  }

  getOrElse(fallback: T): T {
    return this._isOk ? (this._value as T) : fallback;
  }
}
