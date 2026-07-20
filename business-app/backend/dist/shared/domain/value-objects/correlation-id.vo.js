"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationId = void 0;
const crypto_1 = require("crypto");
const value_object_base_1 = require("./value-object.base");
class CorrelationId extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static generate() {
        return new CorrelationId({ value: (0, crypto_1.randomUUID)() });
    }
    static from(value) {
        if (!value?.trim())
            throw new Error('CorrelationId cannot be empty');
        return new CorrelationId({ value: value.trim() });
    }
    get value() {
        return this.props.value;
    }
    toString() {
        return this.props.value;
    }
}
exports.CorrelationId = CorrelationId;
//# sourceMappingURL=correlation-id.vo.js.map