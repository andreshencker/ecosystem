import { ValueObject } from './value-object.base';

// Decimal places per ISO 4217. Currencies not listed default to 2.
const MINOR_UNIT_DECIMALS: Record<string, number> = {
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

function decimalsFor(currency: string): number {
  return MINOR_UNIT_DECIMALS[currency] ?? 2;
}

interface MoneyProps {
  minorUnits: bigint;
  currency: string;
}

/**
 * Immutable monetary amount stored as an exact integer (minor units).
 * AUD 10.50 → 1050n minor units. JPY 1000 → 1000n minor units.
 *
 * All arithmetic is performed in bigint — no floating-point accumulation.
 * Use Money.of() for decimal input, Money.ofMinorUnits() for integer input.
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  // ─── Factories ────────────────────────────────────────────────────────────

  /**
   * Create from a decimal amount. The value is rounded to the currency's
   * minor unit precision at the boundary — after this, all math is exact.
   * Example: Money.of(10.50, 'AUD') → 1050n minor units.
   */
  static of(amount: number, currency: string): Money {
    if (!isFinite(amount)) throw new Error('Amount must be a finite number');
    const code = currency.trim().toUpperCase();
    if (!code || code.length !== 3) {
      throw new Error(`Invalid currency code: ${currency}`);
    }
    const decimals = decimalsFor(code);
    const minorUnits = BigInt(Math.round(amount * Math.pow(10, decimals)));
    return new Money({ minorUnits, currency: code });
  }

  /** Create from an already-computed minor-unit integer. Preferred for persistence and calculations. */
  static ofMinorUnits(minorUnits: bigint, currency: string): Money {
    const code = currency.trim().toUpperCase();
    if (!code || code.length !== 3) {
      throw new Error(`Invalid currency code: ${currency}`);
    }
    return new Money({ minorUnits, currency: code });
  }

  static zero(currency: string): Money {
    return Money.ofMinorUnits(0n, currency);
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get minorUnits(): bigint {
    return this.props.minorUnits;
  }

  get currency(): string {
    return this.props.currency;
  }

  /** Decimal representation for display and serialisation. Not for arithmetic. */
  get amount(): number {
    return this.toDecimal();
  }

  toDecimal(): number {
    const decimals = decimalsFor(this.currency);
    return Number(this.minorUnits) / Math.pow(10, decimals);
  }

  // ─── Arithmetic ───────────────────────────────────────────────────────────

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.ofMinorUnits(
      this.minorUnits + other.minorUnits,
      this.currency,
    );
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.ofMinorUnits(
      this.minorUnits - other.minorUnits,
      this.currency,
    );
  }

  /**
   * Multiply by a decimal factor (e.g. tax rate, quantity).
   * Result is rounded to the nearest minor unit (half-up).
   * Example: Money.of(10, 'AUD').multiply(0.1) → AUD 1.00.
   */
  multiply(factor: number): Money {
    if (!isFinite(factor)) throw new Error('Factor must be a finite number');
    // Scale factor to an integer with 8 decimal places of precision
    const SCALE = 100_000_000n;
    const scaledFactor = BigInt(Math.round(factor * Number(SCALE)));
    const raw = this.minorUnits * scaledFactor;
    const half = this.minorUnits >= 0n ? SCALE / 2n : -(SCALE / 2n);
    const result = (raw + half) / SCALE;
    return Money.ofMinorUnits(result, this.currency);
  }

  // ─── Comparison ───────────────────────────────────────────────────────────

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.minorUnits < other.minorUnits) return -1;
    if (this.minorUnits > other.minorUnits) return 1;
    return 0;
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  isPositive(): boolean {
    return this.minorUnits > 0n;
  }

  isNegative(): boolean {
    return this.minorUnits < 0n;
  }

  // ─── Equality ─────────────────────────────────────────────────────────────

  /**
   * Override ValueObject.equals() — JSON.stringify cannot serialise bigint.
   * Equality: same minorUnits AND same currency.
   */
  equals(other: ValueObject<MoneyProps>): boolean {
    if (!(other instanceof Money)) return false;
    return (
      this.minorUnits === other.minorUnits && this.currency === other.currency
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Currency mismatch: ${this.currency} vs ${other.currency}`,
      );
    }
  }

  toString(): string {
    const decimals = decimalsFor(this.currency);
    const formatted = (
      Number(this.minorUnits) / Math.pow(10, decimals)
    ).toFixed(decimals);
    return `${formatted} ${this.currency}`;
  }
}
