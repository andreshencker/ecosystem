"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Website = void 0;
const value_object_base_1 = require("./value-object.base");
class Website extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(value) {
        try {
            new URL(value);
        }
        catch {
            throw new Error(`Invalid URL: ${value}`);
        }
        return new Website({ value });
    }
    get value() {
        return this.props.value;
    }
    toString() {
        return this.props.value;
    }
}
exports.Website = Website;
//# sourceMappingURL=website.vo.js.map