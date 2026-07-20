/**
 * Pure utility functions for the Communication Purpose recipient autocomplete.
 * Extracted here so they can be unit-tested without a DOM renderer.
 */

import type { ContactFormRow } from './CustomerContactsFieldArray';

export interface ContactOption {
  /** Display label shown in the dropdown (e.g. "angela — ops@co.com"). */
  label: string;
  /** The raw email or phone to store in the form — never the combined label. */
  value: string;
}

// ─── Suggestion builders ──────────────────────────────────────────────────────

export function buildEmailSuggestions(contacts: ContactFormRow[]): ContactOption[] {
  return contacts
    .filter((c) => c.email)
    .map((c) => ({
      label: `${c.name || 'Contact'} — ${c.email}`,
      value: c.email,
    }));
}

export function buildSmsSuggestions(contacts: ContactFormRow[]): ContactOption[] {
  return contacts
    .filter((c) => c.phone)
    .map((c) => ({
      label: `${c.name || 'Contact'} — ${c.phone}`,
      value: c.phone,
    }));
}

// ─── Autocomplete helpers ─────────────────────────────────────────────────────

/**
 * `getOptionLabel` implementation for email and phone autocompletes.
 * Returns only the raw value (email/phone) so that after a user selects
 * a contact suggestion, the input shows the email/phone — not the combined
 * "name — email" display label.
 */
export function getContactOptionLabel(opt: ContactOption | string): string {
  if (typeof opt === 'string') return opt;
  return opt.value;
}

/**
 * `onChange` resolver: maps the MUI Autocomplete selection to the form field value.
 * Always returns just the raw email/phone string — never the combined label or
 * a contact ID.
 */
export function resolveContactOptionValue(val: ContactOption | string | null): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.value;
}
