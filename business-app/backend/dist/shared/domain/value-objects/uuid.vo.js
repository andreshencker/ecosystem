"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UUID = void 0;
const crypto_1 = require("crypto");
const value_object_base_1 = require("./value-object.base");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class UUID extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static generate() {
        return new UUID({ value: (0, crypto_1.randomUUID)() });
    }
    static from(value) {
        if (!UUID_REGEX.test(value))
            throw new Error(`Invalid UUID: ${value}`);
        return new UUID({ value });
    }
    static isValid(value) {
        return UUID_REGEX.test(value);
    }
    get value() {
        return this.props.value;
    }
    toString() {
        return this.props.value;
    }
}
exports.UUID = UUID;
//# sourceMappingURL=uuid.vo.js.map