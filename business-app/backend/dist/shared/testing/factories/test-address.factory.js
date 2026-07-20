"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAddress = createAddress;
const address_vo_1 = require("../../domain/value-objects/address.vo");
function createAddress(overrides) {
    return address_vo_1.Address.of({
        street: '123 Test Street',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        country: 'AU',
        ...overrides,
    });
}
//# sourceMappingURL=test-address.factory.js.map