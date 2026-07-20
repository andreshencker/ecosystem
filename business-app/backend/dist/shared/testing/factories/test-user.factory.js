"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestUser = createTestUser;
const crypto_1 = require("crypto");
function createTestUser(overrides) {
    const id = (0, crypto_1.randomUUID)();
    return {
        id,
        email: `user-${id.slice(0, 8)}@test.local`,
        firstName: 'Test',
        lastName: 'User',
        tenantId: (0, crypto_1.randomUUID)(),
        businessId: (0, crypto_1.randomUUID)(),
        role: 'staff',
        isActive: true,
        ...overrides,
    };
}
//# sourceMappingURL=test-user.factory.js.map