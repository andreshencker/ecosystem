"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Address = void 0;
const value_object_base_1 = require("./value-object.base");
class Address extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(props) {
        if (!props.street?.trim())
            throw new Error('Address street is required');
        if (!props.city?.trim())
            throw new Error('Address city is required');
        if (!props.postalCode?.trim())
            throw new Error('Address postalCode is required');
        if (!props.country?.trim())
            throw new Error('Address country is required');
        return new Address({ ...props, state: props.state });
    }
    get street() {
        return this.props.street;
    }
    get city() {
        return this.props.city;
    }
    get state() {
        return this.props.state;
    }
    get postalCode() {
        return this.props.postalCode;
    }
    get country() {
        return this.props.country;
    }
    toString() {
        return [this.street, this.city, this.state, this.postalCode, this.country]
            .filter(Boolean)
            .join(', ');
    }
}
exports.Address = Address;
//# sourceMappingURL=address.vo.js.map