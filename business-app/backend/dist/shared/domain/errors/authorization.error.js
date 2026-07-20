"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationError = void 0;
const domain_error_base_1 = require("./domain-error.base");
class AuthorizationError extends domain_error_base_1.DomainError {
    code = 'FORBIDDEN';
    constructor(message = 'Access denied', details) {
        super(message, details);
    }
}
exports.AuthorizationError = AuthorizationError;
//# sourceMappingURL=authorization.error.js.map