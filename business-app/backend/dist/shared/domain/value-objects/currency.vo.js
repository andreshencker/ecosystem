"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Currency = void 0;
const value_object_base_1 = require("./value-object.base");
class Currency extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(code) {
        if (!code || code.trim().length !== 3) {
            throw new Error(`Invalid currency code: ${code}. Must be a 3-letter ISO 4217 code.`);
        }
        return new Currency({ code: code.trim().toUpperCase() });
    }
    get code() {
        return this.props.code;
    }
    toString() {
        return this.props.code;
    }
}
exports.Currency = Currency;
//# sourceMappingURL=currency.vo.js.map