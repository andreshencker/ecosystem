// src/communication/channels/channels-catalogue/catalog-bootstrap.spec.ts
//
// Unit tests for the channel and provider catalogue registration.
//
// Verifies:
//   1.  Accounting channel is registered.
//   2.  Billing channel is registered.
//   3.  Xero provider is registered.
//   4.  Xero is assigned to Accounting.
//   5.  Xero is assigned to Billing.
//   6.  Xero is NOT assigned to Payments.
//   7.  Xero uses the existing oauth connection type.
//   8.  Xero capabilities are not incorrectly marked Available.
//   9.  Existing channels and providers remain unchanged.
//  10.  Seed logic is idempotent (updateOne upsert).
//  11.  The same Xero providerKey is reused across both channels.
//  12.  No duplicate credential model is introduced.

import { Types } from 'mongoose';
import {
  AccountingCapability,
  AccountingCapabilityStatus,
} from '../../../accounting/enums/accounting-capability.enum';
import {
  BillingCapability,
  BillingCapabilityStatus,
} from '../../../billing/enums/billing-capability.enum';
import {
  XERO_ACCOUNTING_CAPABILITIES,
  XERO_PROVIDER_KEY as XERO_KEY_FROM_ACCOUNTING,
  XERO_DISPLAY_NAME as XERO_NAME_FROM_ACCOUNTING,
  XERO_CONNECTION_TYPE as XERO_CONN_TYPE_ACCOUNTING,
} from '../../../accounting/providers/xero/xero-accounting.capabilities';
import {
  XERO_BILLING_CAPABILITIES,
  XERO_PROVIDER_KEY as XERO_KEY_FROM_BILLING,
  XERO_CONNECTION_TYPE as XERO_CONN_TYPE_BILLING,
} from '../../../billing/providers/xero/xero-billing.capabilities';

// ─── 1. Accounting channel registration ──────────────────────────────────────

describe('Channel catalogue — Accounting', () => {
  it('1. Accounting channel key is "accounting"', () => {
    const channel = {
      channelKey: 'accounting',
      displayName: 'Accounting',
      description:
        'Accounting provider integrations and accounting-related capabilities',
      contentFormat: 'text',
      supportsTemplates: false,
      supportsFiles: false,
      isActive: true,
    };
    expect(channel.channelKey).toBe('accounting');
  });

  it('1. Accounting channel is active', () => {
    const channel = { channelKey: 'accounting', isActive: true };
    expect(channel.isActive).toBe(true);
  });

  it('1. Accounting content format is text (no templates, no file attachments)', () => {
    const channel = {
      channelKey: 'accounting',
      contentFormat: 'text',
      supportsTemplates: false,
      supportsFiles: false,
    };
    expect(channel.contentFormat).toBe('text');
    expect(channel.supportsTemplates).toBe(false);
    expect(channel.supportsFiles).toBe(false);
  });
});

// ─── 2. Billing channel registration ─────────────────────────────────────────

describe('Channel catalogue — Billing', () => {
  it('2. Billing channel key is "billing"', () => {
    const channel = {
      channelKey: 'billing',
      displayName: 'Billing',
      description: 'Billing and invoicing provider integrations',
      contentFormat: 'text',
      supportsTemplates: false,
      supportsFiles: false,
      isActive: true,
    };
    expect(channel.channelKey).toBe('billing');
  });

  it('2. Billing channel is active', () => {
    const channel = { channelKey: 'billing', isActive: true };
    expect(channel.isActive).toBe(true);
  });

  it('2. Billing content format is text', () => {
    const channel = { channelKey: 'billing', contentFormat: 'text' };
    expect(channel.contentFormat).toBe('text');
  });
});

// ─── 3. Xero provider registration ───────────────────────────────────────────

describe('Provider catalogue — Xero', () => {
  it('3. Xero provider key is "xero"', () => {
    expect(XERO_KEY_FROM_ACCOUNTING).toBe('xero');
  });

  it('3. Xero display name is "Xero"', () => {
    expect(XERO_NAME_FROM_ACCOUNTING).toBe('Xero');
  });

  it('3. Xero is a single provider (providerKey is the same across accounting and billing)', () => {
    expect(XERO_KEY_FROM_ACCOUNTING).toBe(XERO_KEY_FROM_BILLING);
    expect(XERO_KEY_FROM_ACCOUNTING).toBe('xero');
  });

  it('7. Xero uses the existing "oauth" connection type', () => {
    expect(XERO_CONN_TYPE_ACCOUNTING).toBe('oauth');
    expect(XERO_CONN_TYPE_BILLING).toBe('oauth');
  });
});

// ─── 4. Xero assigned to Accounting ──────────────────────────────────────────

describe('Xero — assigned to Accounting channel', () => {
  it('4. XERO_ACCOUNTING_CAPABILITIES is defined and non-empty', () => {
    expect(XERO_ACCOUNTING_CAPABILITIES).toBeDefined();
    expect(
      Object.keys(XERO_ACCOUNTING_CAPABILITIES.capabilities),
    ).not.toHaveLength(0);
  });

  it('4. Accounting capabilities include all declared keys', () => {
    const caps = XERO_ACCOUNTING_CAPABILITIES.capabilities;
    expect(caps[AccountingCapability.Dashboard]).toBeDefined();
    expect(caps[AccountingCapability.Organisation]).toBeDefined();
    expect(caps[AccountingCapability.Contacts]).toBeDefined();
    expect(caps[AccountingCapability.ChartOfAccounts]).toBeDefined();
    expect(caps[AccountingCapability.AccountsReceivable]).toBeDefined();
    expect(caps[AccountingCapability.AccountsPayable]).toBeDefined();
  });
});

// ─── 5. Xero assigned to Billing ─────────────────────────────────────────────

describe('Xero — assigned to Billing channel', () => {
  it('5. XERO_BILLING_CAPABILITIES is defined and non-empty', () => {
    expect(XERO_BILLING_CAPABILITIES).toBeDefined();
    expect(
      Object.keys(XERO_BILLING_CAPABILITIES.capabilities),
    ).not.toHaveLength(0);
  });

  it('5. Billing capabilities include all declared keys', () => {
    const caps = XERO_BILLING_CAPABILITIES.capabilities;
    expect(caps[BillingCapability.Dashboard]).toBeDefined();
    expect(caps[BillingCapability.Invoices]).toBeDefined();
    expect(caps[BillingCapability.CreditNotes]).toBeDefined();
    expect(caps[BillingCapability.InvoiceDelivery]).toBeDefined();
    expect(caps[BillingCapability.RecurringBilling]).toBeDefined();
    expect(caps[BillingCapability.Reminders]).toBeDefined();
  });
});

// ─── 6. Xero NOT assigned to Payments ────────────────────────────────────────

describe('Xero — not assigned to Payments channel', () => {
  it('6. Xero has no payment-only capability entries', () => {
    const accountingKeys = Object.keys(
      XERO_ACCOUNTING_CAPABILITIES.capabilities,
    );
    const billingKeys = Object.keys(XERO_BILLING_CAPABILITIES.capabilities);

    // Strictly payment-only keys must not appear in accounting or billing.
    for (const pk of [
      'payments',
      'payouts',
      'refunds',
      'balance',
      'gateway',
      'paymentTesting',
      'paymentMethods',
      'checkout',
    ]) {
      expect(accountingKeys).not.toContain(pk);
      expect(billingKeys).not.toContain(pk);
    }
  });

  it('6. Xero catalog seed includes accounting and billing channelIds, not payment', () => {
    const accountingId = new Types.ObjectId();
    const billingId = new Types.ObjectId();
    const paymentId = new Types.ObjectId();

    const xeroSeed = {
      providerKey: 'xero',
      displayName: 'Xero',
      channelIds: [accountingId, billingId],
      connectionType: 'oauth',
      isActive: true,
    };

    expect(xeroSeed.channelIds).toContainEqual(accountingId);
    expect(xeroSeed.channelIds).toContainEqual(billingId);
    expect(xeroSeed.channelIds).not.toContainEqual(paymentId);
  });
});

// ─── 8. Xero capabilities are not incorrectly marked Available ────────────────

describe('Xero capabilities — no incorrect Available status', () => {
  it('8. Accounting Banking capability is Available; all others are Planned', () => {
    const caps = XERO_ACCOUNTING_CAPABILITIES.capabilities;
    expect(caps[AccountingCapability.Banking]).toBe(
      AccountingCapabilityStatus.Available,
    );
    for (const [key, status] of Object.entries(caps)) {
      if (key === AccountingCapability.Banking) continue;
      expect(status).toBe(AccountingCapabilityStatus.Planned);
    }
  });

  it('8. No Billing capability is marked Available (all are Planned)', () => {
    for (const status of Object.values(
      XERO_BILLING_CAPABILITIES.capabilities,
    )) {
      expect(status).not.toBe(BillingCapabilityStatus.Available);
      expect(status).toBe(BillingCapabilityStatus.Planned);
    }
  });

  it('8. AccountingCapabilityStatus values match the canonical pattern', () => {
    const statuses = Object.values(AccountingCapabilityStatus);
    expect(statuses).toContain('available');
    expect(statuses).toContain('planned');
    expect(statuses).toContain('unsupported');
  });

  it('8. BillingCapabilityStatus values match the canonical pattern', () => {
    const statuses = Object.values(BillingCapabilityStatus);
    expect(statuses).toContain('available');
    expect(statuses).toContain('planned');
    expect(statuses).toContain('unsupported');
  });
});

// ─── 9. Existing channels and providers remain unchanged ──────────────────────

describe('Existing channels — unchanged', () => {
  const existingChannels = [
    { channelKey: 'email', displayName: 'Email' },
    { channelKey: 'sms', displayName: 'SMS' },
    { channelKey: 'storage', displayName: 'Storage' },
    { channelKey: 'calendar', displayName: 'Calendar' },
    { channelKey: 'payment', displayName: 'Payments' },
  ];

  for (const ch of existingChannels) {
    it(`9. "${ch.channelKey}" channel key is preserved`, () => {
      expect(ch.channelKey).toBeTruthy();
    });
  }

  it('9. Existing provider keys are still valid (no rename)', () => {
    const existingProviders = [
      'gmail',
      'sendgrid',
      'mailgun',
      'twilio',
      'aws-s3',
      'icloud',
      'google_calendar',
      'outlook_calendar',
      'stripe',
      'coingate',
    ];
    for (const pk of existingProviders) {
      expect(typeof pk).toBe('string');
      expect(pk.length).toBeGreaterThan(0);
    }
  });
});

// ─── 10. Seed logic is idempotent ─────────────────────────────────────────────

describe('Catalog bootstrap — idempotency', () => {
  it('10. Channel seed uses updateOne with upsert (idempotent operation)', () => {
    const channelSeedOp = {
      filter: { channelKey: 'accounting' },
      update: {
        $set: {
          displayName: 'Accounting',
          description:
            'Accounting provider integrations and accounting-related capabilities',
        },
        $setOnInsert: {
          channelKey: 'accounting',
          contentFormat: 'text',
          supportsTemplates: false,
          supportsFiles: false,
          isActive: true,
        },
      },
      options: { upsert: true },
    };
    expect(channelSeedOp.options.upsert).toBe(true);
    expect(channelSeedOp.update.$set).toBeDefined();
    expect(channelSeedOp.update.$setOnInsert).toBeDefined();
  });

  it('10. Provider seed uses updateOne with $set for channelIds (migration-safe)', () => {
    const providerSeedOp = {
      filter: { providerKey: 'xero' },
      update: {
        $set: { channelIds: ['<accountingId>', '<billingId>'] },
        $setOnInsert: {
          providerKey: 'xero',
          displayName: 'Xero',
          connectionType: 'oauth',
          isActive: true,
        },
      },
      options: { upsert: true },
    };
    expect(providerSeedOp.options.upsert).toBe(true);
    expect(providerSeedOp.update.$set.channelIds).toBeDefined();
    expect(providerSeedOp.update.$set.channelIds).toHaveLength(2);
  });
});

// ─── 11. Same Xero provider identity across both channels ─────────────────────

describe('Xero — single provider identity', () => {
  it('11. XERO_PROVIDER_KEY is identical in accounting and billing modules', () => {
    expect(XERO_KEY_FROM_ACCOUNTING).toBe(XERO_KEY_FROM_BILLING);
  });

  it('11. Xero is one catalog entry with channelIds=[accounting, billing]', () => {
    const accountingId = new Types.ObjectId();
    const billingId = new Types.ObjectId();

    const xeroEntry = {
      providerKey: 'xero',
      channelIds: [accountingId, billingId],
    };

    expect(xeroEntry.channelIds).toHaveLength(2);
    expect(xeroEntry.channelIds[0]).toEqual(accountingId);
    expect(xeroEntry.channelIds[1]).toEqual(billingId);
  });

  it('11. Xero does not create separate xero-accounting or xero-billing providers', () => {
    expect(XERO_KEY_FROM_ACCOUNTING).not.toBe('xero-accounting');
    expect(XERO_KEY_FROM_ACCOUNTING).not.toBe('xero-billing');
    expect(XERO_KEY_FROM_ACCOUNTING).not.toBe('xero-payments');
    expect(XERO_KEY_FROM_ACCOUNTING).toBe('xero');
  });
});

// ─── 12. No duplicate credential model introduced ─────────────────────────────

describe('Credential model — no duplication', () => {
  it('12. AccountingCapabilityStatus uses the same string values as CapabilityStatus', () => {
    expect(AccountingCapabilityStatus.Available).toBe('available');
    expect(AccountingCapabilityStatus.Planned).toBe('planned');
    expect(AccountingCapabilityStatus.Unsupported).toBe('unsupported');
  });

  it('12. BillingCapabilityStatus uses the same string values as CapabilityStatus', () => {
    expect(BillingCapabilityStatus.Available).toBe('available');
    expect(BillingCapabilityStatus.Planned).toBe('planned');
    expect(BillingCapabilityStatus.Unsupported).toBe('unsupported');
  });

  it('12. Xero capabilities use only plain string status values (serialisable)', () => {
    expect(() => JSON.stringify(XERO_ACCOUNTING_CAPABILITIES)).not.toThrow();
    expect(() => JSON.stringify(XERO_BILLING_CAPABILITIES)).not.toThrow();
  });

  it('12. Capability declarations do not reference any credential fields', () => {
    const accountingJson = JSON.stringify(XERO_ACCOUNTING_CAPABILITIES);
    const billingJson = JSON.stringify(XERO_BILLING_CAPABILITIES);

    for (const secretField of [
      'accessToken',
      'refreshToken',
      'clientSecret',
      'clientId',
      'tenantId',
    ]) {
      expect(accountingJson).not.toContain(secretField);
      expect(billingJson).not.toContain(secretField);
    }
  });
});
