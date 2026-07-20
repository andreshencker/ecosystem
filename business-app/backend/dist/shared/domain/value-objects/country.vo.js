"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Country = void 0;
const value_object_base_1 = require("./value-object.base");
class Country extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(code) {
        if (!code || code.trim().length !== 2) {
            throw new Error(`Invalid country code: ${code}. Must be a 2-letter ISO 3166-1 alpha-2 code.`);
        }
        return new Country({ code: code.trim().toUpperCase() });
    }
    get code() {
        return this.props.code;
    }
    toString() {
        return this.props.code;
    }
}
exports.Country = Country;
//# sourceMappingURL=country.vo.js.map