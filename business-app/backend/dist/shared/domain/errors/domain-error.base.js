"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainError = void 0;
class DomainError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.name = this.constructor.name;
        this.details = details;
    }
}
exports.DomainError = DomainError;
//# sourceMappingURL=domain-error.base.js.map