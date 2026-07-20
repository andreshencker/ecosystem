"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Percentage = void 0;
const value_object_base_1 = require("./value-object.base");
class Percentage extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(value) {
        if (value < 0 || value > 100) {
            throw new Error(`Percentage must be between 0 and 100, got ${value}`);
        }
        return new Percentage({ value });
    }
    get value() {
        return this.props.value;
    }
    toDecimal() {
        return this.props.value / 100;
    }
    toString() {
        return `${this.props.value}%`;
    }
}
exports.Percentage = Percentage;
//# sourceMappingURL=percentage.vo.js.map