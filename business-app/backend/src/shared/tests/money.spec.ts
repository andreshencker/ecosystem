import { Money } from '../domain/value-objects/money.vo';

describe('Money', () => {
  // ── THE critical precision test ──────────────────────────────────────────

  describe('floating-point exactness', () => {
    it('0.1 + 0.2 = 0.30 exactly (no float accumulation)', () => {
      const result = Money.of(0.1, 'AUD').add(Money.of(0.2, 'AUD'));
      expect(result.minorUnits).toBe(30n);
      expect(result.amount).toBe(0.3);
    });

    it('stores amounts as bigint minor units, not floating-point', () => {
      expect(Money.of(10.5, 'AUD').minorUnits).toBe(1050n);
      expect(Money.of(0.01, 'AUD').minorUnits).toBe(1n);
      expect(Money.of(100, 'AUD').minorUnits).toBe(10000n);
    });

    it('repeated addition accumulates exactly', () => {
      let total = Money.zero('AUD');
      for (let i = 0; i < 10; i++) total = total.add(Money.of(0.1, 'AUD'));
      expect(total.minorUnits).toBe(100n); // 10 × 10n = 100n = $1.00
      expect(total.amount).toBe(1.0);
    });
  });

  // ── Factories ────────────────────────────────────────────────────────────

  describe('Money.of()', () => {
    it('creates from decimal amount', () => {
      expect(Money.of(10, 'AUD').minorUnits).toBe(1000n);
      expect(Money.of(10, 'AUD').currency).toBe('AUD');
    });

    it('normalises currency to uppercase', () => {
      expect(Money.of(10, 'aud').currency).toBe('AUD');
    });

    it('throws for non-finite amount', () => {
      expect(() => Money.of(Infinity, 'AUD')).toThrow();
      expect(() => Money.of(NaN, 'AUD')).toThrow();
    });

    it('throws for invalid currency code', () => {
      expect(() => Money.of(10, 'AU')).toThrow();
      expect(() => Money.of(10, '')).toThrow();
      expect(() => Money.of(10, 'AUSD')).toThrow();
    });
  });

  describe('Money.ofMinorUnits()', () => {
    it('creates from bigint without conversion', () => {
      const m = Money.ofMinorUnits(1050n, 'AUD');
      expect(m.minorUnits).toBe(1050n);
      expect(m.amount).toBe(10.5);
    });
  });

  describe('Money.zero()', () => {
    it('creates zero amount', () => {
      expect(Money.zero('AUD').minorUnits).toBe(0n);
      expect(Money.zero('AUD').isZero()).toBe(true);
    });
  });

  // ── Currency-specific minor units ────────────────────────────────────────

  describe('JPY (0 decimal places)', () => {
    it('stores whole units for zero-decimal currencies', () => {
      expect(Money.of(1000, 'JPY').minorUnits).toBe(1000n);
      expect(Money.of(1000, 'JPY').amount).toBe(1000);
    });
  });

  // ── Arithmetic ───────────────────────────────────────────────────────────

  describe('add()', () => {
    it('adds two Money values of the same currency', () => {
      const result = Money.of(5, 'AUD').add(Money.of(3, 'AUD'));
      expect(result.minorUnits).toBe(800n);
      expect(result.amount).toBe(8);
    });

    it('throws when currencies differ', () => {
      expect(() => Money.of(5, 'AUD').add(Money.of(5, 'USD'))).toThrow(
        /currency mismatch/i,
      );
    });
  });

  describe('subtract()', () => {
    it('subtracts two Money values', () => {
      const result = Money.of(10, 'AUD').subtract(Money.of(3, 'AUD'));
      expect(result.minorUnits).toBe(700n);
      expect(result.amount).toBe(7);
    });

    it('can produce a negative result (debit scenario)', () => {
      const result = Money.of(3, 'AUD').subtract(Money.of(10, 'AUD'));
      expect(result.isNegative()).toBe(true);
      expect(result.minorUnits).toBe(-700n);
    });

    it('throws when currencies differ', () => {
      expect(() => Money.of(10, 'AUD').subtract(Money.of(5, 'USD'))).toThrow();
    });
  });

  describe('multiply()', () => {
    it('multiplies by integer factor', () => {
      expect(Money.of(10, 'AUD').multiply(3).minorUnits).toBe(3000n);
    });

    it('multiplies by decimal factor (GST 10%)', () => {
      const gst = Money.of(100, 'AUD').multiply(0.1);
      expect(gst.minorUnits).toBe(1000n); // $10.00
    });

    it('multiplies by decimal factor with rounding (15%)', () => {
      const result = Money.of(100, 'AUD').multiply(0.15);
      expect(result.minorUnits).toBe(1500n); // $15.00 exact
    });

    it('precision: large amount × small rate', () => {
      const result = Money.of(1_000_000, 'AUD').multiply(0.1);
      expect(result.minorUnits).toBe(10_000_000n); // $100,000.00
    });

    it('throws for non-finite factor', () => {
      expect(() => Money.of(10, 'AUD').multiply(NaN)).toThrow();
    });
  });

  // ── Comparison ───────────────────────────────────────────────────────────

  describe('compare()', () => {
    it('returns -1 when less than', () => {
      expect(Money.of(1, 'AUD').compare(Money.of(2, 'AUD'))).toBe(-1);
    });

    it('returns 0 when equal', () => {
      expect(Money.of(5, 'AUD').compare(Money.of(5, 'AUD'))).toBe(0);
    });

    it('returns 1 when greater than', () => {
      expect(Money.of(10, 'AUD').compare(Money.of(5, 'AUD'))).toBe(1);
    });

    it('throws when currencies differ', () => {
      expect(() => Money.of(5, 'AUD').compare(Money.of(5, 'USD'))).toThrow();
    });

    it('can sort an array of Money values', () => {
      const amounts = [
        Money.of(30, 'AUD'),
        Money.of(10, 'AUD'),
        Money.of(20, 'AUD'),
      ];
      const sorted = [...amounts].sort((a, b) => a.compare(b));
      expect(sorted.map((m) => m.amount)).toEqual([10, 20, 30]);
    });
  });

  // ── Equality ─────────────────────────────────────────────────────────────

  describe('equals()', () => {
    it('is equal when minorUnits and currency match', () => {
      expect(Money.of(10, 'AUD').equals(Money.of(10, 'AUD'))).toBe(true);
    });

    it('is not equal when amount differs', () => {
      expect(Money.of(10, 'AUD').equals(Money.of(11, 'AUD'))).toBe(false);
    });

    it('is not equal when currency differs', () => {
      expect(Money.of(10, 'AUD').equals(Money.of(10, 'USD'))).toBe(false);
    });
  });

  // ── Predicates ───────────────────────────────────────────────────────────

  describe('isZero / isPositive / isNegative', () => {
    it('isZero()', () => {
      expect(Money.zero('AUD').isZero()).toBe(true);
      expect(Money.of(1, 'AUD').isZero()).toBe(false);
    });

    it('isPositive()', () => {
      expect(Money.of(0.01, 'AUD').isPositive()).toBe(true);
      expect(Money.zero('AUD').isPositive()).toBe(false);
      expect(Money.of(-1, 'AUD').isPositive()).toBe(false);
    });

    it('isNegative()', () => {
      expect(Money.of(-0.01, 'AUD').isNegative()).toBe(true);
      expect(Money.zero('AUD').isNegative()).toBe(false);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  describe('large financial amounts', () => {
    it('handles multi-million dollar amounts exactly', () => {
      const invoice = Money.of(1_999_999.99, 'AUD');
      expect(invoice.minorUnits).toBe(199_999_999n);
      expect(invoice.amount).toBe(1_999_999.99);
    });
  });

  describe('negative amounts', () => {
    it('represents credit notes and refunds', () => {
      const refund = Money.of(-50.25, 'AUD');
      expect(refund.isNegative()).toBe(true);
      expect(refund.minorUnits).toBe(-5025n);
    });
  });

  describe('immutability', () => {
    it('arithmetic operations return new instances', () => {
      const original = Money.of(10, 'AUD');
      const added = original.add(Money.of(5, 'AUD'));
      expect(original.amount).toBe(10); // unchanged
      expect(added.amount).toBe(15); // new instance
    });
  });

  // ── Serialisation ────────────────────────────────────────────────────────

  describe('toString()', () => {
    it('formats as decimal string with currency', () => {
      expect(Money.of(10.5, 'AUD').toString()).toBe('10.50 AUD');
      expect(Money.of(1000, 'JPY').toString()).toBe('1000 JPY');
    });
  });

  describe('toDecimal()', () => {
    it('returns the decimal representation', () => {
      expect(Money.ofMinorUnits(1050n, 'AUD').toDecimal()).toBe(10.5);
    });
  });
});
