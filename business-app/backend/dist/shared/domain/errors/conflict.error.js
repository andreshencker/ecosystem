"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = void 0;
const domain_error_base_1 = require("./domain-error.base");
class ConflictError extends domain_error_base_1.DomainError {
    code = 'CONFLICT';
    constructor(message, details) {
        super(message, details);
    }
}
exports.ConflictError = ConflictError;
//# sourceMappingURL=conflict.error.js.map