"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCorrelationId = createCorrelationId;
const correlation_id_vo_1 = require("../../domain/value-objects/correlation-id.vo");
function createCorrelationId(value) {
    return value ? correlation_id_vo_1.CorrelationId.from(value) : correlation_id_vo_1.CorrelationId.generate();
}
//# sourceMappingURL=test-correlation-id.factory.js.map