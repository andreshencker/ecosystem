"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = void 0;
const domain_error_base_1 = require("./domain-error.base");
class NotFoundError extends domain_error_base_1.DomainError {
    code = 'NOT_FOUND';
    constructor(resource, id) {
        super(`${resource} with id '${id}' was not found`);
    }
}
exports.NotFoundError = NotFoundError;
//# sourceMappingURL=not-found.error.js.map