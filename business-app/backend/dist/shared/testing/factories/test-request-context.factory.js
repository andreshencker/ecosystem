"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestContext = createRequestContext;
const crypto_1 = require("crypto");
function createRequestContext(overrides) {
    return {
        tenantId: (0, crypto_1.randomUUID)(),
        userId: (0, crypto_1.randomUUID)(),
        correlationId: (0, crypto_1.randomUUID)(),
        locale: 'en-AU',
        timezone: 'Australia/Sydney',
        ip: '127.0.0.1',
        userAgent: 'test-agent/1.0',
        ...overrides,
    };
}
//# sourceMappingURL=test-request-context.factory.js.map