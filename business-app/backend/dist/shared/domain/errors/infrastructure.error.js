"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfrastructureError = void 0;
const domain_error_base_1 = require("./domain-error.base");
class InfrastructureError extends domain_error_base_1.DomainError {
    code;
    constructor(code, message, details) {
        super(message, details);
        this.code = code;
    }
}
exports.InfrastructureError = InfrastructureError;
//# sourceMappingURL=infrastructure.error.js.map