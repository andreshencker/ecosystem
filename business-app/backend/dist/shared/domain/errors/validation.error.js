"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
const domain_error_base_1 = require("./domain-error.base");
class ValidationError extends domain_error_base_1.DomainError {
    code = 'VALIDATION_ERROR';
    fields;
    constructor(message, fields, details) {
        super(message, details);
        this.fields = fields ?? {};
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=validation.error.js.map