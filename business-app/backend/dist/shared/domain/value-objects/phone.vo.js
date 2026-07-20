"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Phone = void 0;
const value_object_base_1 = require("./value-object.base");
class Phone extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(value, countryCode) {
        const normalized = value.replace(/\s+/g, '');
        if (!normalized)
            throw new Error('Phone value cannot be empty');
        return new Phone({ value: normalized, countryCode });
    }
    get value() {
        return this.props.value;
    }
    get countryCode() {
        return this.props.countryCode;
    }
    toString() {
        return this.props.value;
    }
}
exports.Phone = Phone;
//# sourceMappingURL=phone.vo.js.map