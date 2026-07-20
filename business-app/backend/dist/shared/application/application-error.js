"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationError = void 0;
const domain_error_base_1 = require("../domain/errors/domain-error.base");
class ApplicationError extends domain_error_base_1.DomainError {
    code;
    constructor(code, message, details) {
        super(message, details);
        this.code = code;
    }
}
exports.ApplicationError = ApplicationError;
//# sourceMappingURL=application-error.js.map