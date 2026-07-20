"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantId = void 0;
const crypto_1 = require("crypto");
const value_object_base_1 = require("./value-object.base");
class TenantId extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static generate() {
        return new TenantId({ value: (0, crypto_1.randomUUID)() });
    }
    static from(value) {
        if (!value?.trim())
            throw new Error('TenantId cannot be empty');
        return new TenantId({ value: value.trim() });
    }
    get value() {
        return this.props.value;
    }
    toString() {
        return this.props.value;
    }
}
exports.TenantId = TenantId;
//# sourceMappingURL=tenant-id.vo.js.map