"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timezone = void 0;
const value_object_base_1 = require("./value-object.base");
class Timezone extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(value) {
        if (!value?.trim())
            throw new Error('Timezone value cannot be empty');
        return new Timezone({ value: value.trim() });
    }
    get value() {
        return this.props.value;
    }
    toString() {
        return this.props.value;
    }
}
exports.Timezone = Timezone;
//# sourceMappingURL=timezone.vo.js.map