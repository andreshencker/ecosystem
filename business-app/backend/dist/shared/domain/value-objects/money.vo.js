"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
const value_object_base_1 = require("./value-object.base");
const MINOR_UNIT_DECIMALS = {
    AUD: 2,
    USD: 2,
    EUR: 2,
    GBP: 2,
    CAD: 2,
    NZD: 2,
    CHF: 2,
    CNY: 2,
    HKD: 2,
    SGD: 2,
    INR: 2,
    BRL: 2,
    ARS: 2,
    MXN: 2,
    JPY: 0,
    KRW: 0,
    VND: 0,
};
function decimalsFor(currency) {
    return MINOR_UNIT_DECIMALS[currency] ?? 2;
}
class Money extends value_object_base_1.ValueObject {
    constructor(props) {
        super(props);
    }
    static of(amount, currency) {
        if (!isFinite(amount))
            throw new Error('Amount must be a finite number');
        const code = currency.trim().toUpperCase();
        if (!code || code.length !== 3) {
            throw new Error(`Invalid currency code: ${currency}`);
        }
        const decimals = decimalsFor(code);
        const minorUnits = BigInt(Math.round(amount * Math.pow(10, decimals)));
        return new Money({ minorUnits, currency: code });
    }
    static ofMinorUnits(minorUnits, currency) {
        const code = currency.trim().toUpperCase();
        if (!code || code.length !== 3) {
            throw new Error(`Invalid currency code: ${currency}`);
        }
        return new Money({ minorUnits, currency: code });
    }
    static zero(currency) {
        return Money.ofMinorUnits(0n, currency);
    }
    get minorUnits() {
        return this.props.minorUnits;
    }
    get currency() {
        return this.props.currency;
    }
    get amount() {
        return this.toDecimal();
    }
    toDecimal() {
        const decimals = decimalsFor(this.currency);
        return Number(this.minorUnits) / Math.pow(10, decimals);
    }
    add(other) {
        this.assertSameCurrency(other);
        return Money.ofMinorUnits(this.minorUnits + other.minorUnits, this.currency);
    }
    subtract(other) {
        this.assertSameCurrency(other);
        return Money.ofMinorUnits(this.minorUnits - other.minorUnits, this.currency);
    }
    multiply(factor) {
        if (!isFinite(factor))
            throw new Error('Factor must be a finite number');
        const SCALE = 100000000n;
        const scaledFactor = BigInt(Math.round(factor * Number(SCALE)));
        const raw = this.minorUnits * scaledFactor;
        const half = this.minorUnits >= 0n ? SCALE / 2n : -(SCALE / 2n);
        const result = (raw + half) / SCALE;
        return Money.ofMinorUnits(result, this.currency);
    }
    compare(other) {
        this.assertSameCurrency(other);
        if (this.minorUnits < other.minorUnits)
            return -1;
        if (this.minorUnits > other.minorUnits)
            return 1;
        return 0;
    }
    isZero() {
        return this.minorUnits === 0n;
    }
    isPositive() {
        return this.minorUnits > 0n;
    }
    isNegative() {
        return this.minorUnits < 0n;
    }
    equals(other) {
        if (!(other instanceof Money))
            return false;
        return (this.minorUnits === other.minorUnits && this.currency === other.currency);
    }
    assertSameCurrency(other) {
        if (this.currency !== other.currency) {
            throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
        }
    }
    toString() {
        const decimals = decimalsFor(this.currency);
        const formatted = (Number(this.minorUnits) / Math.pow(10, decimals)).toFixed(decimals);
        return `${formatted} ${this.currency}`;
    }
}
exports.Money = Money;
//# sourceMappingURL=money.vo.js.map