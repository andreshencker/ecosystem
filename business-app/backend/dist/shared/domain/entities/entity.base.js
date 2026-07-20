"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entity = void 0;
class Entity {
    _id;
    constructor(_id) {
        this._id = _id;
    }
    get id() {
        return this._id;
    }
    equals(other) {
        if (!(other instanceof Entity))
            return false;
        const a = this._id;
        const b = other._id;
        if (a === b)
            return true;
        if (a !== null &&
            a !== undefined &&
            typeof a.equals === 'function') {
            return a.equals(b);
        }
        return false;
    }
}
exports.Entity = Entity;
//# sourceMappingURL=entity.base.js.map