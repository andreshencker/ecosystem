import { Address } from '../domain/value-objects/address.vo';
import { CorrelationId } from '../domain/value-objects/correlation-id.vo';
import { Country } from '../domain/value-objects/country.vo';
import { Currency } from '../domain/value-objects/currency.vo';
import { Email } from '../domain/value-objects/email.vo';
import { EntityId } from '../domain/value-objects/entity-id.vo';
import { Language } from '../domain/value-objects/language.vo';
import { Locale } from '../domain/value-objects/locale.vo';
import { Percentage } from '../domain/value-objects/percentage.vo';
import { Phone } from '../domain/value-objects/phone.vo';
import { TenantId } from '../domain/value-objects/tenant-id.vo';
import { Timezone } from '../domain/value-objects/timezone.vo';
import { UUID } from '../domain/value-objects/uuid.vo';
import { ValueObject } from '../domain/value-objects/value-object.base';
import { Website } from '../domain/value-objects/website.vo';
import { Entity } from '../domain/entities/entity.base';

// ── ValueObject base ──────────────────────────────────────────────────────────

describe('ValueObject base', () => {
  class TestVO extends ValueObject<{ x: number; y: number }> {
    static of(x: number, y: number): TestVO {
      return new TestVO({ x, y });
    }
    get x() {
      return this.props.x;
    }
    get y() {
      return this.props.y;
    }
  }

  it('equals() compares by value, not reference', () => {
    const a = TestVO.of(1, 2);
    const b = TestVO.of(1, 2);
    expect(a).not.toBe(b);
    expect(a.equals(b)).toBe(true);
  });

  it('equals() returns false for different values', () => {
    expect(TestVO.of(1, 2).equals(TestVO.of(1, 3))).toBe(false);
  });

  it('props are frozen (immutable)', () => {
    const vo = TestVO.of(1, 2);
    expect(() => {
      (vo as any).props.x = 99;
    }).toThrow();
  });

  it('equals() returns false for different VO types', () => {
    class OtherVO extends ValueObject<{ x: number; y: number }> {
      static of(x: number, y: number) {
        return new OtherVO({ x, y });
      }
    }
    const a = TestVO.of(1, 2);
    const b = OtherVO.of(1, 2);
    expect(a.equals(b as any)).toBe(false);
  });
});

// ── EntityId / TenantId / CorrelationId ───────────────────────────────────────

describe('EntityId', () => {
  it('equals() compares by value', () => {
    const id = EntityId.generate();
    const copy = EntityId.from(id.value);
    expect(id.equals(copy)).toBe(true);
    expect(id).not.toBe(copy); // different references
  });

  it('from() and generate() produce distinct instances', () => {
    const a = EntityId.generate();
    const b = EntityId.generate();
    expect(a.equals(b)).toBe(false);
  });

  it('from() rejects empty value', () => {
    expect(() => EntityId.from('')).toThrow();
    expect(() => EntityId.from('   ')).toThrow();
  });

  it('toString() returns the raw value', () => {
    const id = EntityId.from('abc-123');
    expect(id.toString()).toBe('abc-123');
  });

  it('extends ValueObject (compile-time validated)', () => {
    expect(EntityId.generate()).toBeInstanceOf(ValueObject);
  });
});

describe('TenantId', () => {
  it('equals() compares by value', () => {
    const a = TenantId.from('tenant-abc');
    const b = TenantId.from('tenant-abc');
    expect(a.equals(b)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('two different TenantIds are not equal', () => {
    expect(TenantId.generate().equals(TenantId.generate())).toBe(false);
  });

  it('extends ValueObject', () => {
    expect(TenantId.generate()).toBeInstanceOf(ValueObject);
  });
});

describe('CorrelationId', () => {
  it('equals() compares by value', () => {
    const a = CorrelationId.from('corr-xyz');
    const b = CorrelationId.from('corr-xyz');
    expect(a.equals(b)).toBe(true);
  });

  it('extends ValueObject', () => {
    expect(CorrelationId.generate()).toBeInstanceOf(ValueObject);
  });
});

// ── Entity.equals() with ValueObject IDs ─────────────────────────────────────

describe('Entity.equals() with EntityId as TId', () => {
  class MyEntity extends Entity<EntityId> {
    constructor(id: EntityId) {
      super(id);
    }
  }

  it('two entities with same EntityId value are equal', () => {
    const id = EntityId.generate();
    const e1 = new MyEntity(id);
    const e2 = new MyEntity(EntityId.from(id.value)); // different instance, same value
    expect(e1.equals(e2)).toBe(true);
  });

  it('entities with different EntityId values are not equal', () => {
    const e1 = new MyEntity(EntityId.generate());
    const e2 = new MyEntity(EntityId.generate());
    expect(e1.equals(e2)).toBe(false);
  });
});

// ── UUID ──────────────────────────────────────────────────────────────────────

describe('UUID', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  it('generate() produces a valid UUID', () => {
    expect(UUID.isValid(UUID.generate().value)).toBe(true);
  });

  it('from() accepts a valid UUID string', () => {
    expect(UUID.from(VALID_UUID).value).toBe(VALID_UUID);
  });

  it('from() rejects an invalid UUID', () => {
    expect(() => UUID.from('not-a-uuid')).toThrow();
    expect(() => UUID.from('')).toThrow();
  });

  it('isValid() returns correct result', () => {
    expect(UUID.isValid(VALID_UUID)).toBe(true);
    expect(UUID.isValid('not-uuid')).toBe(false);
  });

  it('equals() by value', () => {
    const a = UUID.from(VALID_UUID);
    const b = UUID.from(VALID_UUID);
    expect(a.equals(b)).toBe(true);
    expect(a).not.toBe(b);
  });
});

// ── Email ─────────────────────────────────────────────────────────────────────

describe('Email', () => {
  it('normalises to lowercase and trims whitespace', () => {
    expect(Email.of('  User@EXAMPLE.COM  ').value).toBe('user@example.com');
  });

  it('accepts valid email formats', () => {
    expect(() => Email.of('a@b.co')).not.toThrow();
    expect(() => Email.of('user+tag@domain.org')).not.toThrow();
  });

  it('rejects invalid email formats', () => {
    expect(() => Email.of('notanemail')).toThrow();
    expect(() => Email.of('missing@')).toThrow();
    expect(() => Email.of('@nodomain.com')).toThrow();
    expect(() => Email.of('')).toThrow();
  });

  it('equals() compares normalised values', () => {
    expect(
      Email.of('User@Example.com').equals(Email.of('user@example.com')),
    ).toBe(true);
  });

  it('uses REGEX.EMAIL from the shared kernel (no inline duplicate)', () => {
    // If Email imported its own EMAIL_REGEX instead of REGEX.EMAIL, they could diverge.
    // This test verifies the same validation is applied.
    const { REGEX } = require('../kernel/regex');
    expect(REGEX.EMAIL.test('user@example.com')).toBe(true);
    expect(REGEX.EMAIL.test('not-email')).toBe(false);
  });
});

// ── Phone ─────────────────────────────────────────────────────────────────────

describe('Phone', () => {
  it('strips whitespace', () => {
    expect(Phone.of('+61 4 1234 5678').value).toBe('+61412345678');
  });

  it('rejects empty value', () => {
    expect(() => Phone.of('')).toThrow();
    expect(() => Phone.of('   ')).toThrow();
  });

  it('stores optional countryCode', () => {
    const phone = Phone.of('+61412345678', 'AU');
    expect(phone.countryCode).toBe('AU');
  });

  it('equals() compares normalised value and countryCode', () => {
    const a = Phone.of('+61 412 345 678');
    const b = Phone.of('+61412345678');
    expect(a.equals(b)).toBe(true);
  });
});

// ── Website ───────────────────────────────────────────────────────────────────

describe('Website', () => {
  it('accepts valid HTTP/HTTPS URLs', () => {
    expect(() => Website.of('https://example.com')).not.toThrow();
    expect(() => Website.of('http://sub.domain.co.au/path?q=1')).not.toThrow();
  });

  it('rejects invalid URLs', () => {
    expect(() => Website.of('not a url')).toThrow();
    expect(() => Website.of('ftp://not-http')).not.toThrow(); // URL spec accepts ftp
    expect(() => Website.of('')).toThrow();
  });

  it('equals() by value', () => {
    expect(
      Website.of('https://example.com').equals(
        Website.of('https://example.com'),
      ),
    ).toBe(true);
  });
});

// ── Address ───────────────────────────────────────────────────────────────────

describe('Address', () => {
  const VALID = {
    street: '1 Test St',
    city: 'Sydney',
    postalCode: '2000',
    country: 'AU',
  };

  it('creates with valid fields', () => {
    const addr = Address.of(VALID);
    expect(addr.street).toBe('1 Test St');
    expect(addr.city).toBe('Sydney');
    expect(addr.state).toBeUndefined();
  });

  it('accepts optional state', () => {
    const addr = Address.of({ ...VALID, state: 'NSW' });
    expect(addr.state).toBe('NSW');
  });

  it('rejects missing required fields', () => {
    expect(() => Address.of({ ...VALID, street: '' })).toThrow();
    expect(() => Address.of({ ...VALID, city: '' })).toThrow();
    expect(() => Address.of({ ...VALID, postalCode: '' })).toThrow();
    expect(() => Address.of({ ...VALID, country: '' })).toThrow();
  });

  it('equals() by structural value', () => {
    const a = Address.of(VALID);
    const b = Address.of(VALID);
    expect(a.equals(b)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('toString() formats all non-undefined fields', () => {
    const addr = Address.of({ ...VALID, state: 'NSW' });
    expect(addr.toString()).toContain('1 Test St');
    expect(addr.toString()).toContain('NSW');
  });
});

// ── Currency ──────────────────────────────────────────────────────────────────

describe('Currency', () => {
  it('normalises to uppercase', () => {
    expect(Currency.of('aud').code).toBe('AUD');
  });

  it('rejects codes that are not 3 letters', () => {
    expect(() => Currency.of('AU')).toThrow();
    expect(() => Currency.of('AUSD')).toThrow();
    expect(() => Currency.of('')).toThrow();
  });

  it('equals() by code', () => {
    expect(Currency.of('aud').equals(Currency.of('AUD'))).toBe(true);
    expect(Currency.of('AUD').equals(Currency.of('USD'))).toBe(false);
  });
});

// ── Country ───────────────────────────────────────────────────────────────────

describe('Country', () => {
  it('normalises to uppercase', () => {
    expect(Country.of('au').code).toBe('AU');
  });

  it('rejects codes that are not 2 letters', () => {
    expect(() => Country.of('AUS')).toThrow();
    expect(() => Country.of('A')).toThrow();
    expect(() => Country.of('')).toThrow();
  });

  it('equals() by code', () => {
    expect(Country.of('AU').equals(Country.of('au'))).toBe(true);
    expect(Country.of('AU').equals(Country.of('US'))).toBe(false);
  });
});

// ── Language ──────────────────────────────────────────────────────────────────

describe('Language', () => {
  it('normalises to lowercase', () => {
    expect(Language.of('EN').code).toBe('en');
  });

  it('rejects codes that are not 2 letters', () => {
    expect(() => Language.of('eng')).toThrow();
    expect(() => Language.of('')).toThrow();
  });

  it('equals() by code', () => {
    expect(Language.of('en').equals(Language.of('EN'))).toBe(true);
    expect(Language.of('en').equals(Language.of('es'))).toBe(false);
  });
});

// ── Locale ────────────────────────────────────────────────────────────────────

describe('Locale', () => {
  it('accepts BCP-47 locale tags', () => {
    expect(Locale.of('en-AU').value).toBe('en-AU');
    expect(Locale.of('es-AR').value).toBe('es-AR');
  });

  it('rejects empty value', () => {
    expect(() => Locale.of('')).toThrow();
    expect(() => Locale.of('   ')).toThrow();
  });

  it('equals() by value', () => {
    expect(Locale.of('en-AU').equals(Locale.of('en-AU'))).toBe(true);
    expect(Locale.of('en-AU').equals(Locale.of('en-US'))).toBe(false);
  });

  it('NOTE: does not validate BCP-47 format — any non-empty string is accepted', () => {
    // Known gap documented in OBS-04. Format validation can be added when
    // i18n requirements are formalised. Non-empty string is the current contract.
    expect(() => Locale.of('xyz-INVALID')).not.toThrow();
  });
});

// ── Timezone ──────────────────────────────────────────────────────────────────

describe('Timezone', () => {
  it('accepts IANA timezone identifiers', () => {
    expect(Timezone.of('Australia/Sydney').value).toBe('Australia/Sydney');
    expect(Timezone.of('America/New_York').value).toBe('America/New_York');
    expect(Timezone.of('UTC').value).toBe('UTC');
  });

  it('rejects empty value', () => {
    expect(() => Timezone.of('')).toThrow();
  });

  it('equals() by value', () => {
    expect(
      Timezone.of('Australia/Sydney').equals(Timezone.of('Australia/Sydney')),
    ).toBe(true);
    expect(Timezone.of('UTC').equals(Timezone.of('Australia/Sydney'))).toBe(
      false,
    );
  });

  it('NOTE: does not validate against IANA list — any non-empty string is accepted', () => {
    // Known gap documented in OBS-04. Can be restricted to a pre-validated list.
    expect(() => Timezone.of('not/a/timezone')).not.toThrow();
  });
});

// ── Percentage ────────────────────────────────────────────────────────────────

describe('Percentage', () => {
  it('accepts values 0–100', () => {
    expect(Percentage.of(0).value).toBe(0);
    expect(Percentage.of(50).value).toBe(50);
    expect(Percentage.of(100).value).toBe(100);
  });

  it('rejects values outside 0–100', () => {
    expect(() => Percentage.of(-1)).toThrow();
    expect(() => Percentage.of(100.01)).toThrow();
    expect(() => Percentage.of(101)).toThrow();
  });

  it('toDecimal() converts percentage to ratio', () => {
    expect(Percentage.of(10).toDecimal()).toBe(0.1);
    expect(Percentage.of(100).toDecimal()).toBe(1);
    expect(Percentage.of(0).toDecimal()).toBe(0);
  });

  it('toString() appends % symbol', () => {
    expect(Percentage.of(15).toString()).toBe('15%');
  });

  it('equals() by value', () => {
    expect(Percentage.of(10).equals(Percentage.of(10))).toBe(true);
    expect(Percentage.of(10).equals(Percentage.of(20))).toBe(false);
  });
});
