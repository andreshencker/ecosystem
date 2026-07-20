"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIUnavailableError = void 0;
class BIUnavailableError extends Error {
    statusCode;
    category;
    constructor(message = 'Business Intelligence service is unavailable', statusCode, category) {
        super(message);
        this.name = 'BIUnavailableError';
        this.statusCode = statusCode;
        this.category = category ?? BIUnavailableError.categorize(statusCode);
    }
    static categorize(statusCode) {
        if (!statusCode)
            return 'unknown';
        if (statusCode === 401 || statusCode === 403)
            return 'auth_error';
        if (statusCode === 404)
            return 'not_found';
        if (statusCode === 422)
            return 'validation_error';
        if (statusCode >= 500)
            return 'bi_internal_error';
        return 'unknown';
    }
}
exports.BIUnavailableError = BIUnavailableError;
//# sourceMappingURL=bi-unavailable.error.js.map