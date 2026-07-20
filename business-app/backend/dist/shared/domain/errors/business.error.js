"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessError = void 0;
const domain_error_base_1 = require("./domain-error.base");
class BusinessError extends domain_error_base_1.DomainError {
    code;
    constructor(code, message, details) {
        super(message, details);
        this.code = code;
    }
}
exports.BusinessError = BusinessError;
//# sourceMappingURL=business.error.js.map