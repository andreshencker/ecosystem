"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestBusiness = createTestBusiness;
const crypto_1 = require("crypto");
function createTestBusiness(overrides) {
    const suffix = Math.random().toString(36).slice(2, 8);
    return {
        id: (0, crypto_1.randomUUID)(),
        businessKey: `test-biz-${suffix}`,
        businessName: 'Test Business Ltd',
        tenantId: (0, crypto_1.randomUUID)(),
        ownerUserId: null,
        defaultCurrency: 'AUD',
        isActive: true,
        ...overrides,
    };
}
//# sourceMappingURL=test-business.factory.js.map