"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Email = void 0;
const regex_1 = require("../../kernel/regex");
const value_object_base_1 = require("./value-object.base");
class Email extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(value) {
        const normalized = value.trim().toLowerCase();
        if (!regex_1.REGEX.EMAIL.test(normalized)) {
            throw new Error(`Invalid email address: ${value}`);
        }
        return new Email({ value: normalized });
    }
    get value() {
        return this.props.value;
    }
    toString() {
        return this.props.value;
    }
}
exports.Email = Email;
//# sourceMappingURL=email.vo.js.map