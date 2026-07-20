"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueObject = void 0;
class ValueObject {
    props;
    constructor(props) {
        this.props = Object.freeze({ ...props });
    }
    equals(other) {
        if (Object.getPrototypeOf(this) !== Object.getPrototypeOf(other))
            return false;
        return JSON.stringify(this.props) === JSON.stringify(other.props);
    }
}
exports.ValueObject = ValueObject;
//# sourceMappingURL=value-object.base.js.map