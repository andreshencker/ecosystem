"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Language = void 0;
const value_object_base_1 = require("./value-object.base");
class Language extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(code) {
        if (!code || code.trim().length !== 2) {
            throw new Error(`Invalid language code: ${code}. Must be a 2-letter ISO 639-1 code.`);
        }
        return new Language({ code: code.trim().toLowerCase() });
    }
    get code() {
        return this.props.code;
    }
    toString() {
        return this.props.code;
    }
}
exports.Language = Language;
//# sourceMappingURL=language.vo.js.map