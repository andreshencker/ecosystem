import {
  buildEmailSuggestions,
  buildSmsSuggestions,
  getContactOptionLabel,
  resolveContactOptionValue,
  type ContactOption,
} from '../purposeAutocomplete.utils';
import type { ContactFormRow } from '../CustomerContactsFieldArray';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeContact(overrides: Partial<ContactFormRow> = {}): ContactFormRow {
  return {
    name:       'Angela',
    email:      'operations@jayproductions.com.au',
    phone:      '+61448116700',
    role:       '',
    isPrimary:  false,
    locationId: '',
    ...overrides,
  };
}

// ─── buildEmailSuggestions ────────────────────────────────────────────────────

describe('buildEmailSuggestions', () => {
  it('returns one suggestion per contact that has an email', () => {
    const contacts = [
      makeContact({ name: 'Angela', email: 'angela@co.com' }),
      makeContact({ name: 'Bob',    email: 'bob@co.com'   }),
    ];
    const result = buildEmailSuggestions(contacts);
    expect(result).toHaveLength(2);
  });

  it('omits contacts without an email', () => {
    const contacts = [
      makeContact({ email: '' }),
      makeContact({ email: 'valid@co.com' }),
    ];
    expect(buildEmailSuggestions(contacts)).toHaveLength(1);
  });

  it('stores only the email in .value — not the name or combined label', () => {
    const contacts = [makeContact({ name: 'Angela', email: 'operations@jayproductions.com.au' })];
    const [opt] = buildEmailSuggestions(contacts);
    expect(opt.value).toBe('operations@jayproductions.com.au');
  });

  it('includes the contact name in .label for display', () => {
    const contacts = [makeContact({ name: 'Angela', email: 'angela@co.com' })];
    const [opt] = buildEmailSuggestions(contacts);
    expect(opt.label).toContain('Angela');
    expect(opt.label).toContain('angela@co.com');
  });

  it('.label is not a valid email address (it is a combined display string)', () => {
    const contacts = [makeContact({ name: 'Angela', email: 'angela@co.com' })];
    const [opt] = buildEmailSuggestions(contacts);
    expect(opt.label).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('uses "Contact" as the name fallback when name is empty', () => {
    const contacts = [makeContact({ name: '', email: 'noname@co.com' })];
    const [opt] = buildEmailSuggestions(contacts);
    expect(opt.label).toContain('Contact');
  });

  it('returns empty array for contacts with no emails', () => {
    const contacts = [makeContact({ email: '' }), makeContact({ email: '' })];
    expect(buildEmailSuggestions(contacts)).toEqual([]);
  });

  it('does not store contact name, contactId, or combined label in .value', () => {
    const contacts = [makeContact({ name: 'Angela', email: 'angela@co.com' })];
    const [opt] = buildEmailSuggestions(contacts);
    expect(opt.value).not.toContain('Angela');
    expect(opt.value).not.toContain('—');
    expect(opt).not.toHaveProperty('id');
    expect(opt).not.toHaveProperty('contactId');
  });
});

// ─── buildSmsSuggestions ──────────────────────────────────────────────────────

describe('buildSmsSuggestions', () => {
  it('returns one suggestion per contact that has a phone', () => {
    const contacts = [
      makeContact({ phone: '+61411000001' }),
      makeContact({ phone: '+61411000002' }),
    ];
    expect(buildSmsSuggestions(contacts)).toHaveLength(2);
  });

  it('omits contacts without a phone', () => {
    const contacts = [
      makeContact({ phone: '' }),
      makeContact({ phone: '+61411000001' }),
    ];
    expect(buildSmsSuggestions(contacts)).toHaveLength(1);
  });

  it('stores only the phone number in .value', () => {
    const contacts = [makeContact({ name: 'Angela', phone: '+61448116700' })];
    const [opt] = buildSmsSuggestions(contacts);
    expect(opt.value).toBe('+61448116700');
  });

  it('does not store the name or combined label in .value', () => {
    const contacts = [makeContact({ name: 'Angela', phone: '+61448116700' })];
    const [opt] = buildSmsSuggestions(contacts);
    expect(opt.value).not.toContain('Angela');
    expect(opt.value).not.toContain('—');
  });

  it('includes the contact name in .label for display', () => {
    const contacts = [makeContact({ name: 'Angela', phone: '+61448116700' })];
    const [opt] = buildSmsSuggestions(contacts);
    expect(opt.label).toContain('Angela');
    expect(opt.label).toContain('+61448116700');
  });
});

// ─── getContactOptionLabel ────────────────────────────────────────────────────

describe('getContactOptionLabel', () => {
  it('returns opt.value (email) for a ContactOption — NOT opt.label', () => {
    const opt: ContactOption = {
      label: 'Angela — operations@jayproductions.com.au',
      value: 'operations@jayproductions.com.au',
    };
    expect(getContactOptionLabel(opt)).toBe('operations@jayproductions.com.au');
  });

  it('returned value is a valid email for email suggestions', () => {
    const opt: ContactOption = {
      label: 'Bob — bob@company.com',
      value: 'bob@company.com',
    };
    const result = getContactOptionLabel(opt);
    expect(result).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('does NOT return the combined "name — email" label', () => {
    const opt: ContactOption = {
      label: 'Angela — angela@co.com',
      value: 'angela@co.com',
    };
    expect(getContactOptionLabel(opt)).not.toContain('Angela');
    expect(getContactOptionLabel(opt)).not.toContain('—');
  });

  it('returns the string as-is for freeSolo manual input', () => {
    expect(getContactOptionLabel('accounts@company.com')).toBe('accounts@company.com');
  });

  it('returns opt.value for phone number suggestions', () => {
    const opt: ContactOption = {
      label: 'Angela — +61448116700',
      value: '+61448116700',
    };
    expect(getContactOptionLabel(opt)).toBe('+61448116700');
  });
});

// ─── resolveContactOptionValue ────────────────────────────────────────────────

describe('resolveContactOptionValue', () => {
  it('returns opt.value when a ContactOption is selected', () => {
    const opt: ContactOption = {
      label: 'Angela — operations@jayproductions.com.au',
      value: 'operations@jayproductions.com.au',
    };
    expect(resolveContactOptionValue(opt)).toBe('operations@jayproductions.com.au');
  });

  it('selected email passes the email validation pattern', () => {
    const opt: ContactOption = {
      label: 'Angela — operations@jayproductions.com.au',
      value: 'operations@jayproductions.com.au',
    };
    const stored = resolveContactOptionValue(opt);
    expect(stored).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('returns the raw string for freeSolo manual email entry', () => {
    expect(resolveContactOptionValue('accounts@company.com')).toBe('accounts@company.com');
  });

  it('returns the raw string for freeSolo manual phone entry', () => {
    expect(resolveContactOptionValue('+61411000000')).toBe('+61411000000');
  });

  it('returns empty string when selection is null (cleared)', () => {
    expect(resolveContactOptionValue(null)).toBe('');
  });

  it('does NOT store the contact name', () => {
    const opt: ContactOption = { label: 'Angela — angela@co.com', value: 'angela@co.com' };
    expect(resolveContactOptionValue(opt)).not.toContain('Angela');
  });

  it('does NOT store the combined "name — email" label', () => {
    const opt: ContactOption = { label: 'Angela — angela@co.com', value: 'angela@co.com' };
    expect(resolveContactOptionValue(opt)).not.toContain('—');
  });

  it('stores only the phone number — not name — for SMS suggestions', () => {
    const opt: ContactOption = { label: 'Angela — +61448116700', value: '+61448116700' };
    expect(resolveContactOptionValue(opt)).toBe('+61448116700');
  });

  it('payload structure: selected email maps to { email, recipientType } only', () => {
    const opt: ContactOption = { label: 'Angela — ops@co.com', value: 'ops@co.com' };
    const emailFieldValue = resolveContactOptionValue(opt);
    const payload = { email: emailFieldValue, recipientType: 'to' as const };
    expect(payload).toEqual({ email: 'ops@co.com', recipientType: 'to' });
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('contactId');
    expect(payload).not.toHaveProperty('label');
  });
});
