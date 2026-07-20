"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.right = exports.left = exports.Right = exports.Left = void 0;
class Left {
    value;
    constructor(value) {
        this.value = value;
    }
    static of(value) {
        return new Left(value);
    }
    isLeft() {
        return true;
    }
    isRight() {
        return false;
    }
}
exports.Left = Left;
class Right {
    value;
    constructor(value) {
        this.value = value;
    }
    static of(value) {
        return new Right(value);
    }
    isLeft() {
        return false;
    }
    isRight() {
        return true;
    }
}
exports.Right = Right;
const left = (value) => Left.of(value);
exports.left = left;
const right = (value) => Right.of(value);
exports.right = right;
//# sourceMappingURL=either.js.map