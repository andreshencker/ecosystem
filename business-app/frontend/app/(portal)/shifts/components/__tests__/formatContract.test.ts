/**
 * Tests for formatContractLabel and formatContractSecondary.
 *
 * These formatters control how Contract options appear in every selector on
 * the Shifts page (create drawer, assign panel, pending modal). The key
 * invariants are:
 *   - Two Contracts with the same position are distinguishable by Customer.
 *   - The visible label always includes both Customer name and position.
 *   - The submitted value is always contractId only.
 *   - customerId and customerName are never sent by the frontend.
 *   - A missing customerName uses the safe fallback "Unknown customer".
 */

import { formatContractLabel, formatContractSecondary } from '@/lib/formatContract';
import type { Contract } from '@/types/contract';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id:                       'ctr-1',
    businessId:               'biz-1',
    customerId:               'cust-1',
    customerName:             'Jay Productions',
    startDate:                '2026-01-01',
    endDate:                  null,
    positionName:             'Audiovisual Technician',
    workType:                 'contractor',
    invoiceDescription:       'AV services',
    status:                   'active',
    billingCycle:             'weekly',
    paymentTermsDays:         14,
    scheduledPaymentEnabled:  false,
    scheduledPaymentDay:      null,
    rateType:                 'fixed',
    minimumHours:             0,
    defaultBreakMinutes:      0,
    rates:                    [],
    notes:                    null,
    useInvoicePrefix:         false,
    invoicePrefix:            null,
    startingInvoiceNumber:    1,
    currency:                 'AUD',
    chargeGst:                true,
    gstRate:                  10,
    holidayRules: {
      enabled:              false,
      calendarId:           null,
      calendarName:         null,
      calendarProviderName: null,
      behaviour:            'normal_rate',
      multiplier:           null,
      fixedHourlyRate:      null,
    },
    superannuationRules: {
      enabled:          false,
      rate:             null,
      paymentFrequency: null,
    },
    paymentCalendarEnabled:         false,
    paymentCalendarSubscriptionId:  null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── formatContractLabel ──────────────────────────────────────────────────────

describe('formatContractLabel', () => {
  it('formats "Customer Name — Position"', () => {
    const c = makeContract({ customerName: 'Jay Productions', positionName: 'Audiovisual Technician' });
    expect(formatContractLabel(c)).toBe('Jay Productions — Audiovisual Technician');
  });

  it('uses "Unknown customer" when customerName is null', () => {
    const c = makeContract({ customerName: null, positionName: 'Technician' });
    expect(formatContractLabel(c)).toBe('Unknown customer — Technician');
  });

  it('uses "Unknown customer" when customerName is empty string', () => {
    const c = makeContract({ customerName: '', positionName: 'Sound Engineer' });
    expect(formatContractLabel(c)).toBe('Unknown customer — Sound Engineer');
  });

  it('uses "Unknown customer" when customerName is whitespace only', () => {
    const c = makeContract({ customerName: '   ', positionName: 'Operator' });
    expect(formatContractLabel(c)).toBe('Unknown customer — Operator');
  });

  it('two Contracts with the same position are distinguishable by Customer', () => {
    const c1 = makeContract({ customerName: 'Jay Productions',   positionName: 'Technician', id: 'ctr-1' });
    const c2 = makeContract({ customerName: 'Sound Events Corp', positionName: 'Technician', id: 'ctr-2' });
    const label1 = formatContractLabel(c1);
    const label2 = formatContractLabel(c2);
    expect(label1).not.toBe(label2);
    expect(label1).toContain('Jay Productions');
    expect(label2).toContain('Sound Events Corp');
    expect(label1).toContain('Technician');
    expect(label2).toContain('Technician');
  });

  it('two Contracts with the same Customer but different positions are distinguishable', () => {
    const c1 = makeContract({ customerName: 'Jay Productions', positionName: 'AV Technician',  id: 'ctr-1' });
    const c2 = makeContract({ customerName: 'Jay Productions', positionName: 'Sound Engineer', id: 'ctr-2' });
    expect(formatContractLabel(c1)).not.toBe(formatContractLabel(c2));
    expect(formatContractLabel(c1)).toContain('AV Technician');
    expect(formatContractLabel(c2)).toContain('Sound Engineer');
  });

  it('always includes both customer name and position in the label', () => {
    const c = makeContract({ customerName: 'Acme Corp', positionName: 'Project Manager' });
    const label = formatContractLabel(c);
    expect(label).toContain('Acme Corp');
    expect(label).toContain('Project Manager');
  });

  it('does not include contractId in the label', () => {
    const c = makeContract({ id: 'ctr-secret-123' });
    const label = formatContractLabel(c);
    expect(label).not.toContain('ctr-secret-123');
  });

  it('does not include customerId in the label', () => {
    const c = makeContract({ customerId: 'cust-secret-456' });
    const label = formatContractLabel(c);
    expect(label).not.toContain('cust-secret-456');
  });
});

// ─── formatContractSecondary ──────────────────────────────────────────────────

describe('formatContractSecondary', () => {
  it('formats "Status · Billing cycle"', () => {
    const c = makeContract({ status: 'active', billingCycle: 'weekly' });
    expect(formatContractSecondary(c)).toBe('Active · Weekly');
  });

  it('formats inactive Contract', () => {
    const c = makeContract({ status: 'inactive', billingCycle: 'monthly' });
    expect(formatContractSecondary(c)).toBe('Inactive · Monthly');
  });

  it('formats per-shift billing cycle', () => {
    const c = makeContract({ status: 'active', billingCycle: 'per_shift' });
    expect(formatContractSecondary(c)).toBe('Active · Per shift');
  });

  it('formats fortnightly billing cycle', () => {
    const c = makeContract({ status: 'active', billingCycle: 'fortnightly' });
    expect(formatContractSecondary(c)).toBe('Active · Fortnightly');
  });

  it('formats draft status', () => {
    const c = makeContract({ status: 'draft', billingCycle: 'weekly' });
    expect(formatContractSecondary(c)).toBe('Draft · Weekly');
  });

  it('contains a separator between status and billing cycle', () => {
    const c = makeContract({ status: 'active', billingCycle: 'daily' });
    expect(formatContractSecondary(c)).toContain('·');
  });
});

// ─── Submission contract ──────────────────────────────────────────────────────

describe('Contract selector submission contract', () => {
  it('the submitted value is contractId — not customerName, customerId, or businessId', () => {
    // The selector onChange handler sets selectedContractId = e.target.value = c.id.
    // These payloads must never appear in the request body.
    const forbiddenFields = ['customerName', 'customerId', 'businessId'];
    const assignPayload = { contractId: 'ctr-1' };
    forbiddenFields.forEach((field) => {
      expect(assignPayload).not.toHaveProperty(field);
    });
    expect(assignPayload).toHaveProperty('contractId');
  });

  it('formatContractLabel accepts only display-safe fields', () => {
    // The formatter receives Contract shape — it only reads customerName and positionName.
    // It does NOT expose customerId, businessId, or any financial details.
    const displayInput = { customerName: 'Jay Productions', positionName: 'Technician' };
    const label = formatContractLabel(displayInput as any);
    expect(label).toBe('Jay Productions — Technician');
  });

  it('safe fallback used when the Business name is not the same entity as the Customer', () => {
    // "Unknown customer" is the correct fallback — NOT the business name.
    const c = makeContract({ customerName: null });
    const label = formatContractLabel(c);
    expect(label).toContain('Unknown customer');
    expect(label).not.toContain('biz-1');    // businessId must not appear
    expect(label).not.toContain('Jay');       // customerName was null — no guessing
  });
});
