"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntityId = createEntityId;
const entity_id_vo_1 = require("../../domain/value-objects/entity-id.vo");
function createEntityId(value) {
    return value ? entity_id_vo_1.EntityId.from(value) : entity_id_vo_1.EntityId.generate();
}
//# sourceMappingURL=test-entity-id.factory.js.map