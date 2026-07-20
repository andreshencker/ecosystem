/**
 * Unit tests for the contact ↔ location reference logic.
 * These cover pure functions that can be tested without a DOM.
 */

import {
  locationsToFormRows,
  formRowsToLocations,
  buildContactsPayload,
} from '../CustomerFormDrawer';
import type { LocationFormRow } from '../CustomerLocationsFieldArray';
import type { ContactFormRow } from '../CustomerContactsFieldArray';
import type { CustomerLocation } from '@/types/customer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLocation(overrides: Partial<CustomerLocation> = {}): CustomerLocation {
  return {
    id:         'loc_001',
    tag:        'Warehouse',
    country:    'Australia',
    line1:      '260 Horsley Road',
    line2:      null,
    city:       'Milperra',
    postalCode: '2214',
    state:      'NSW',
    ...overrides,
  };
}

function makeContact(overrides: Partial<ContactFormRow> = {}): ContactFormRow {
  return {
    name:       'Angela',
    email:      'angela@co.com',
    phone:      '+61411000000',
    role:       'Operations',
    isPrimary:  false,
    locationId: '',
    ...overrides,
  };
}

function makeLocRow(overrides: Partial<LocationFormRow> = {}): LocationFormRow {
  return {
    localId:    'local_warehouse',
    _id:        'loc_001',
    tag:        'Warehouse',
    country:    'Australia',
    line1:      '260 Horsley Road',
    line2:      '',
    city:       'Milperra',
    postalCode: '2214',
    state:      'NSW',
    ...overrides,
  };
}

// ─── locationsToFormRows ──────────────────────────────────────────────────────

describe('locationsToFormRows', () => {
  it('maps a real location to a form row with matching localId = id', () => {
    const rows = locationsToFormRows([makeLocation({ id: 'abc123' })]);
    expect(rows[0].localId).toBe('abc123');
    expect(rows[0]._id).toBe('abc123');
  });

  it('copies all address fields to the form row', () => {
    const [row] = locationsToFormRows([makeLocation()]);
    expect(row.tag).toBe('Warehouse');
    expect(row.country).toBe('Australia');
    expect(row.city).toBe('Milperra');
    expect(row.postalCode).toBe('2214');
    expect(row.state).toBe('NSW');
  });

  it('converts null line2 to empty string', () => {
    const [row] = locationsToFormRows([makeLocation({ line2: null })]);
    expect(row.line2).toBe('');
  });

  it('generates a fresh UUID for legacy-address sentinel (not the sentinel itself)', () => {
    const rows = locationsToFormRows([makeLocation({ id: 'legacy-address' })]);
    expect(rows[0].localId).not.toBe('legacy-address');
    expect(rows[0]._id).toBeUndefined();
    // UUID format
    expect(rows[0].localId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('maps multiple locations in order', () => {
    const rows = locationsToFormRows([
      makeLocation({ id: 'loc_1', tag: 'Head Office' }),
      makeLocation({ id: 'loc_2', tag: 'Warehouse'  }),
    ]);
    expect(rows[0].tag).toBe('Head Office');
    expect(rows[1].tag).toBe('Warehouse');
    expect(rows[0].localId).toBe('loc_1');
    expect(rows[1].localId).toBe('loc_2');
  });
});

// ─── formRowsToLocations ──────────────────────────────────────────────────────

describe('formRowsToLocations', () => {
  it('sends existing _id so backend preserves the location ObjectId', () => {
    const row = makeLocRow({ _id: 'existing_db_id' });
    const [payload] = formRowsToLocations([row]);
    expect(payload.id).toBe('existing_db_id');
  });

  it('sends id: undefined for new (unsaved) locations', () => {
    const row = makeLocRow({ _id: undefined });
    const [payload] = formRowsToLocations([row]);
    expect(payload.id).toBeUndefined();
  });

  it('trims whitespace from all fields', () => {
    const row = makeLocRow({ tag: '  Warehouse  ', city: '  Milperra  ' });
    const [payload] = formRowsToLocations([row]);
    expect(payload.tag).toBe('Warehouse');
    expect(payload.city).toBe('Milperra');
  });

  it('sends line2: undefined when the field is empty', () => {
    const row = makeLocRow({ line2: '' });
    const [payload] = formRowsToLocations([row]);
    expect(payload.line2).toBeUndefined();
  });

  it('does NOT include localId in the payload', () => {
    const [payload] = formRowsToLocations([makeLocRow()]);
    expect(payload).not.toHaveProperty('localId');
  });
});

// ─── buildContactsPayload ─────────────────────────────────────────────────────

describe('buildContactsPayload', () => {
  it('resolves locationId (localId) to the correct locationIndex', () => {
    const locations = [
      makeLocRow({ localId: 'local_hq',        tag: 'Head Office' }),
      makeLocRow({ localId: 'local_warehouse',  tag: 'Warehouse'   }),
    ];
    const contacts = [
      makeContact({ name: 'Angela', locationId: 'local_warehouse' }),
    ];
    const [payload] = buildContactsPayload(contacts, locations);
    expect(payload.locationIndex).toBe(1);
  });

  it('sets locationIndex to null when contact has no location', () => {
    const locations = [makeLocRow({ localId: 'local_hq' })];
    const contacts  = [makeContact({ name: 'Bob', locationId: '' })];
    const [payload] = buildContactsPayload(contacts, locations);
    expect(payload.locationIndex).toBeNull();
  });

  it('sets locationIndex to null when locationId references a removed location', () => {
    const locations = [makeLocRow({ localId: 'local_hq' })];
    const contacts  = [makeContact({ name: 'Carol', locationId: 'stale_id_no_longer_exists' })];
    const [payload] = buildContactsPayload(contacts, locations);
    expect(payload.locationIndex).toBeNull();
  });

  it('maps multiple contacts to correct indexes', () => {
    const locations = [
      makeLocRow({ localId: 'local_a', tag: 'A' }),
      makeLocRow({ localId: 'local_b', tag: 'B' }),
    ];
    const contacts = [
      makeContact({ name: 'Alice', locationId: 'local_b' }),
      makeContact({ name: 'Bob',   locationId: 'local_a' }),
      makeContact({ name: 'Carol', locationId: '' }),
    ];
    const payloads = buildContactsPayload(contacts, locations);
    expect(payloads[0].locationIndex).toBe(1);
    expect(payloads[1].locationIndex).toBe(0);
    expect(payloads[2].locationIndex).toBeNull();
  });

  it('does NOT store tag, address, or complete location data in the contact payload', () => {
    const locations = [makeLocRow({ localId: 'local_hq' })];
    const contacts  = [makeContact({ name: 'Dave', locationId: 'local_hq' })];
    const [payload] = buildContactsPayload(contacts, locations);
    expect(payload).not.toHaveProperty('locationTag');
    expect(payload).not.toHaveProperty('country');
    expect(payload).not.toHaveProperty('city');
    expect(payload).not.toHaveProperty('line1');
    expect(payload).toHaveProperty('locationIndex');
  });

  it('contact with no location is still included in the payload', () => {
    const locations: LocationFormRow[] = [];
    const contacts  = [makeContact({ name: 'Eve', locationId: '' })];
    const payloads = buildContactsPayload(contacts, locations);
    expect(payloads).toHaveLength(1);
    expect(payloads[0].locationIndex).toBeNull();
  });

  it('contact with no name is excluded', () => {
    const locations: LocationFormRow[] = [];
    const contacts  = [makeContact({ name: '' })];
    expect(buildContactsPayload(contacts, locations)).toHaveLength(0);
  });

  it('contact locationId assignment persists when location tag is changed', () => {
    // The relationship is by localId, not by tag — so a tag rename doesn't break it.
    const locations = [makeLocRow({ localId: 'local_wh', tag: 'Old Tag' })];
    const contacts  = [makeContact({ locationId: 'local_wh' })];
    // Simulate tag change:
    locations[0] = { ...locations[0], tag: 'New Tag' };
    const [payload] = buildContactsPayload(contacts, locations);
    // Still resolves to index 0 because localId is unchanged
    expect(payload.locationIndex).toBe(0);
  });
});
