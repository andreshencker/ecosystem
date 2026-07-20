"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantId = createTenantId;
const tenant_id_vo_1 = require("../../domain/value-objects/tenant-id.vo");
function createTenantId(value) {
    return value ? tenant_id_vo_1.TenantId.from(value) : tenant_id_vo_1.TenantId.generate();
}
//# sourceMappingURL=test-tenant-id.factory.js.map