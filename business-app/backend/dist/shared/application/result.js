"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Result = void 0;
class Result {
    _isOk;
    _value;
    _error;
    constructor(_isOk, _value, _error) {
        this._isOk = _isOk;
        this._value = _value;
        this._error = _error;
    }
    static ok(value) {
        return new Result(true, value);
    }
    static fail(error) {
        return new Result(false, undefined, error);
    }
    get isOk() {
        return this._isOk;
    }
    get isFail() {
        return !this._isOk;
    }
    get value() {
        if (!this._isOk)
            throw new Error('Cannot get value from a failed Result');
        return this._value;
    }
    get error() {
        if (this._isOk)
            throw new Error('Cannot get error from a successful Result');
        return this._error;
    }
    map(fn) {
        if (this._isOk)
            return Result.ok(fn(this._value));
        return Result.fail(this._error);
    }
    getOrElse(fallback) {
        return this._isOk ? this._value : fallback;
    }
}
exports.Result = Result;
//# sourceMappingURL=result.js.map