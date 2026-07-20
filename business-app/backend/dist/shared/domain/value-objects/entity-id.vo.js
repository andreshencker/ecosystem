"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityId = void 0;
const crypto_1 = require("crypto");
const value_object_base_1 = require("./value-object.base");
class EntityId extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static generate() {
        return new EntityId({ value: (0, crypto_1.randomUUID)() });
    }
    static from(value) {
        if (!value?.trim())
            throw new Error('EntityId cannot be empty');
        return new EntityId({ value: value.trim() });
    }
    get value() {
        return this.props.value;
    }
    toString() {
        return this.props.value;
    }
}
exports.EntityId = EntityId;
//# sourceMappingURL=entity-id.vo.js.map