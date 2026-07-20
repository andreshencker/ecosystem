"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMoney = createMoney;
const money_vo_1 = require("../../domain/value-objects/money.vo");
function createMoney(amount = 100, currency = 'AUD') {
    return money_vo_1.Money.of(amount, currency);
}
//# sourceMappingURL=test-money.factory.js.map