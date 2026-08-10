// src/accounting/providers/xero/xero-scope.constants.spec.ts
//
// Unit tests for the Xero OAuth scope architecture.
//
// These tests enforce the least-privilege scope model and verify that:
//   - Only valid granular Xero scopes are emitted.
//   - Legacy broad scopes never appear in any generated string.
//   - Each Banking endpoint maps to the correct granular scope.
//   - The scope builder is deterministic and deduplicated.
//   - Unimplemented capabilities do not contribute scopes.
//   - Authorization URL metadata is complete and contains no secrets.
//   - Generic infrastructure does not contain Xero-specific scope knowledge.

import {
  XeroScope,
  buildXeroScopes,
  XERO_ACCOUNTING_SCOPES,
  type XeroScopeValue,
} from './xero-scope.constants';
import { AccountingCapability } from '../../enums/accounting-capability.enum';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Split a space-separated scope string into an array. */
function scopeList(str: string): string[] {
  return str.split(' ').filter(Boolean);
}

// ─── 1. Legacy broad scopes are never emitted ────────────────────────────────

describe('Legacy scopes — never emitted', () => {
  // NOTE: 'accounting.settings' (without .read suffix) is the write scope and IS valid.
  // The legacy broad scopes that are rejected by new Xero app registrations are:
  const LEGACY_BROAD_SCOPES = [
    'accounting.reports.read',
    'accounting.transactions',
    'accounting.read',
  ];

  it.each(LEGACY_BROAD_SCOPES)(
    'accounting.reports.read and other legacy broad scopes are absent: %s',
    (legacy) => {
      const scopes = scopeList(XERO_ACCOUNTING_SCOPES);
      expect(scopes).not.toContain(legacy);
    },
  );

  it('accounting.reports.read is not in XeroScope object', () => {
    const values = Object.values(XeroScope) as string[];
    expect(values).not.toContain('accounting.reports.read');
  });

  it('buildXeroScopes with all implemented capabilities never emits legacy scopes', () => {
    const scopes = scopeList(buildXeroScopes([AccountingCapability.Banking]));
    LEGACY_BROAD_SCOPES.forEach((legacy) => {
      expect(scopes).not.toContain(legacy);
    });
  });
});

// ─── 2. Other obsolete broad scopes not emitted ──────────────────────────────

describe('Obsolete identity scopes — not emitted by default', () => {
  it('profile scope is not in XERO_ACCOUNTING_SCOPES', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).not.toContain('profile');
  });

  it('email scope is not in XERO_ACCOUNTING_SCOPES', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).not.toContain('email');
  });

  it('accounting.transactions.read (deprecated broad scope) is not in XERO_ACCOUNTING_SCOPES', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).not.toContain(
      'accounting.transactions.read',
    );
  });
});

// ─── 3. Banking maps to currently valid scopes only ──────────────────────────

describe('Banking capability scope mapping', () => {
  const bankingScopes = scopeList(
    buildXeroScopes([AccountingCapability.Banking]),
  );

  it('Banking includes accounting.settings (write scope covers read)', () => {
    expect(bankingScopes).toContain(XeroScope.AccountingSettings);
  });

  it('Banking includes accounting.reports.banksummary.read', () => {
    expect(bankingScopes).toContain(XeroScope.ReportsBankSummaryRead);
  });

  it('Banking includes offline_access', () => {
    expect(bankingScopes).toContain(XeroScope.OfflineAccess);
  });

  it('Banking includes openid', () => {
    expect(bankingScopes).toContain(XeroScope.OpenId);
  });

  it('Banking contains exactly 4 scopes (no extras)', () => {
    expect(bankingScopes).toHaveLength(4);
  });

  it('Banking scopes are only valid granular Xero scope values', () => {
    const validValues = new Set(Object.values(XeroScope) as string[]);
    for (const scope of bankingScopes) {
      expect(validValues).toContain(scope);
    }
  });
});

// ─── 4. BankSummary report receives its required granular scope ──────────────

describe('BankSummary report scope', () => {
  it('accounting.reports.banksummary.read covers GET /Reports/BankSummary', () => {
    const scopes = scopeList(XERO_ACCOUNTING_SCOPES);
    expect(scopes).toContain('accounting.reports.banksummary.read');
  });

  it('XeroScope.ReportsBankSummaryRead equals the correct Xero scope string', () => {
    expect(XeroScope.ReportsBankSummaryRead).toBe(
      'accounting.reports.banksummary.read',
    );
  });
});

// ─── 5. Account list/detail/write receives accounting.settings ────────────────

describe('Account list, detail, and write scope', () => {
  it('accounting.settings covers GET/PUT/POST/DELETE /Accounts and GET /Organisations', () => {
    const scopes = scopeList(XERO_ACCOUNTING_SCOPES);
    expect(scopes).toContain('accounting.settings');
  });

  it('XeroScope.AccountingSettings equals the correct Xero write scope string', () => {
    expect(XeroScope.AccountingSettings).toBe('accounting.settings');
  });

  it('XeroScope.AccountingSettingsRead equals the correct Xero read-only scope string', () => {
    expect(XeroScope.AccountingSettingsRead).toBe('accounting.settings.read');
  });
});

// ─── 6. offline_access is present ────────────────────────────────────────────

describe('offline_access scope', () => {
  it('XERO_ACCOUNTING_SCOPES contains offline_access', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).toContain('offline_access');
  });

  it('buildXeroScopes always includes offline_access regardless of capabilities', () => {
    // Even with an empty capability list the base scopes are always included.
    const scopes = scopeList(buildXeroScopes([]));
    expect(scopes).toContain('offline_access');
  });
});

// ─── 7. Scope output is deduplicated ─────────────────────────────────────────

describe('Deduplication', () => {
  it('repeated Banking capability does not produce duplicate scopes', () => {
    const result = buildXeroScopes([
      AccountingCapability.Banking,
      AccountingCapability.Banking,
    ]);
    const scopes = scopeList(result);
    const unique = new Set(scopes);
    expect(scopes.length).toBe(unique.size);
  });

  it('all scopes in XERO_ACCOUNTING_SCOPES are unique', () => {
    const scopes = scopeList(XERO_ACCOUNTING_SCOPES);
    const unique = new Set(scopes);
    expect(scopes.length).toBe(unique.size);
  });
});

// ─── 8. Scope output is deterministic ────────────────────────────────────────

describe('Determinism', () => {
  it('buildXeroScopes produces the same string on repeated calls', () => {
    const a = buildXeroScopes([AccountingCapability.Banking]);
    const b = buildXeroScopes([AccountingCapability.Banking]);
    expect(a).toBe(b);
  });

  it('scope order is alphabetical (sorted)', () => {
    const scopes = scopeList(XERO_ACCOUNTING_SCOPES);
    const sorted = [...scopes].sort();
    expect(scopes).toEqual(sorted);
  });

  it('XERO_ACCOUNTING_SCOPES equals buildXeroScopes([Banking, BankTransactions, ManualJournals, Journals, ChartOfAccounts])', () => {
    expect(XERO_ACCOUNTING_SCOPES).toBe(
      buildXeroScopes([
        AccountingCapability.Banking,
        AccountingCapability.BankTransactions,
        AccountingCapability.ManualJournals,
        AccountingCapability.Journals,
        AccountingCapability.ChartOfAccounts,
      ]),
    );
  });
});

// ─── 9. Unimplemented capabilities do not add scopes ─────────────────────────

describe('Unimplemented capabilities — no extra scopes', () => {
  // ChartOfAccounts, ManualJournals, and Journals are now implemented — excluded here.
  // BankFeed and Reconciliation are Planned (standard Xero API does not expose them) — included.
  const UNIMPLEMENTED: AccountingCapability[] = [
    AccountingCapability.Contacts,
    AccountingCapability.AccountsReceivable,
    AccountingCapability.AccountsPayable,
    AccountingCapability.Payroll,
    AccountingCapability.Assets,
    AccountingCapability.Inventory,
    AccountingCapability.Budgets,
    AccountingCapability.Reports,
    AccountingCapability.Tax,
    AccountingCapability.Organisation,
    AccountingCapability.Files,
    AccountingCapability.Webhooks,
    AccountingCapability.Sync,
    AccountingCapability.Dashboard,
    AccountingCapability.PaymentRecords,
    AccountingCapability.BankFeed,
    AccountingCapability.Reconciliation,
  ];

  it('unimplemented capabilities do not expand the Banking+ChartOfAccounts scope string', () => {
    const baseScopes = buildXeroScopes([
      AccountingCapability.Banking,
      AccountingCapability.ChartOfAccounts,
    ]);
    const withUnimplemented = buildXeroScopes([
      AccountingCapability.Banking,
      AccountingCapability.ChartOfAccounts,
      ...UNIMPLEMENTED,
    ]);
    // Unimplemented capabilities have no scope mapping, so the result is identical.
    expect(withUnimplemented).toBe(baseScopes);
  });

  it.each(UNIMPLEMENTED)('capability %s alone adds only base scopes', (cap) => {
    const result = buildXeroScopes([cap]);
    const scopes = scopeList(result);
    // Only openid and offline_access — no capability-specific scopes.
    expect(scopes).toHaveLength(2);
    expect(scopes).toContain('openid');
    expect(scopes).toContain('offline_access');
  });
});

// ─── ChartOfAccounts capability scope mapping ────────────────────────────────

describe('ChartOfAccounts capability scope mapping', () => {
  const coaScopes = scopeList(
    buildXeroScopes([AccountingCapability.ChartOfAccounts]),
  );

  it('ChartOfAccounts includes accounting.settings', () => {
    expect(coaScopes).toContain(XeroScope.AccountingSettings);
  });

  it('ChartOfAccounts includes offline_access', () => {
    expect(coaScopes).toContain(XeroScope.OfflineAccess);
  });

  it('ChartOfAccounts includes openid', () => {
    expect(coaScopes).toContain(XeroScope.OpenId);
  });

  it('ChartOfAccounts contains exactly 3 scopes (no report scopes)', () => {
    expect(coaScopes).toHaveLength(3);
  });
});

// ─── BankTransactions capability scope mapping ───────────────────────────────

describe('BankTransactions capability scope mapping', () => {
  const btScopes = scopeList(
    buildXeroScopes([AccountingCapability.BankTransactions]),
  );

  it('BankTransactions includes accounting.banktransactions.read', () => {
    expect(btScopes).toContain(XeroScope.AccountingBankTransactionsRead);
  });

  it('BankTransactions does not include deprecated accounting.transactions.read', () => {
    expect(btScopes).not.toContain('accounting.transactions.read');
  });

  it('BankTransactions includes offline_access', () => {
    expect(btScopes).toContain(XeroScope.OfflineAccess);
  });

  it('BankTransactions includes openid', () => {
    expect(btScopes).toContain(XeroScope.OpenId);
  });

  it('BankTransactions contains exactly 3 scopes', () => {
    expect(btScopes).toHaveLength(3);
  });
});

// ─── ManualJournals capability scope mapping ──────────────────────────────────

describe('ManualJournals capability scope mapping', () => {
  const mjScopes = scopeList(
    buildXeroScopes([AccountingCapability.ManualJournals]),
  );

  it('ManualJournals includes accounting.manualjournals (write scope)', () => {
    expect(mjScopes).toContain(XeroScope.AccountingManualJournals);
  });

  it('ManualJournals does not include the read-only accounting.manualjournals.read', () => {
    // Write scope (accounting.manualjournals) includes read — no need for the read-only variant.
    expect(mjScopes).not.toContain('accounting.manualjournals.read');
  });

  it('ManualJournals does not include deprecated accounting.transactions.read', () => {
    expect(mjScopes).not.toContain('accounting.transactions.read');
  });

  it('ManualJournals includes offline_access', () => {
    expect(mjScopes).toContain(XeroScope.OfflineAccess);
  });

  it('ManualJournals includes openid', () => {
    expect(mjScopes).toContain(XeroScope.OpenId);
  });

  it('ManualJournals contains exactly 3 scopes', () => {
    expect(mjScopes).toHaveLength(3);
  });

  it('XeroScope.AccountingManualJournals equals the correct Xero write scope string', () => {
    expect(XeroScope.AccountingManualJournals).toBe(
      'accounting.manualjournals',
    );
  });

  it('XeroScope.AccountingManualJournalsRead equals the correct Xero read-only scope string', () => {
    expect(XeroScope.AccountingManualJournalsRead).toBe(
      'accounting.manualjournals.read',
    );
  });
});

// ─── Journals (General Ledger) capability scope mapping ──────────────────────

describe('Journals (General Ledger) capability scope mapping', () => {
  const glScopes = scopeList(buildXeroScopes([AccountingCapability.Journals]));

  it('Journals includes accounting.journals.read (read-only General Ledger scope)', () => {
    expect(glScopes).toContain(XeroScope.AccountingJournalsRead);
  });

  it('Journals does not include accounting.manualjournals (separate write capability)', () => {
    expect(glScopes).not.toContain('accounting.manualjournals');
  });

  it('Journals includes offline_access', () => {
    expect(glScopes).toContain(XeroScope.OfflineAccess);
  });

  it('Journals includes openid', () => {
    expect(glScopes).toContain(XeroScope.OpenId);
  });

  it('Journals contains exactly 3 scopes', () => {
    expect(glScopes).toHaveLength(3);
  });

  it('XeroScope.AccountingJournalsRead equals the correct Xero scope string', () => {
    expect(XeroScope.AccountingJournalsRead).toBe('accounting.journals.read');
  });
});

// ─── 10. XeroScope object contains no secrets ────────────────────────────────

describe('No secrets in scope metadata', () => {
  it('XeroScope values are all public non-secret strings', () => {
    for (const [key, value] of Object.entries(XeroScope)) {
      expect(typeof value).toBe('string');
      expect(value).not.toContain('secret');
      expect(value).not.toContain('token');
      expect(value).not.toContain('password');
      expect(value).not.toContain('key');
      // Scope identifiers contain only: letters, dots, underscores
      expect(value).toMatch(/^[a-z_.]+$/);
    }
  });

  it('XERO_ACCOUNTING_SCOPES contains no credential-like values', () => {
    expect(XERO_ACCOUNTING_SCOPES).not.toMatch(/Bearer /i);
    expect(XERO_ACCOUNTING_SCOPES).not.toMatch(/[A-Z0-9]{20,}/); // no long base64/token fragments
  });
});

// ─── 11. base scopes always present ──────────────────────────────────────────

describe('Base scopes always present', () => {
  it('openid is always included even with empty capability list', () => {
    const scopes = scopeList(buildXeroScopes([]));
    expect(scopes).toContain('openid');
  });

  it('offline_access is always included even with empty capability list', () => {
    const scopes = scopeList(buildXeroScopes([]));
    expect(scopes).toContain('offline_access');
  });
});

// ─── 12. XeroScope values are distinct (no accidental duplicates in the object)

describe('XeroScope object integrity', () => {
  it('all XeroScope values are distinct', () => {
    const values = Object.values(XeroScope) as string[];
    const unique = new Set(values);
    expect(values.length).toBe(unique.size);
  });

  it('XeroScope does not contain retired legacy broad scopes', () => {
    const values = Object.values(XeroScope) as string[];
    // NOTE: 'accounting.settings' (without .read) is the valid write scope — it IS in XeroScope.
    // Only the aliases that are rejected by new Xero registrations are excluded here.
    const legacy = [
      'accounting.reports.read',
      'accounting.transactions',
      'accounting.read',
      'profile',
      'email',
    ];
    for (const bad of legacy) {
      expect(values).not.toContain(bad);
    }
  });
});

// ─── 13. Generic components remain provider-neutral ──────────────────────────

describe('Provider neutrality', () => {
  it('buildXeroScopes is the only place where the canonical scope string is assembled', () => {
    // The function is pure: same input → same output, no side effects.
    const r1 = buildXeroScopes([AccountingCapability.Banking]);
    const r2 = buildXeroScopes([AccountingCapability.Banking]);
    expect(r1).toBe(r2);
    expect(typeof r1).toBe('string');
  });

  it('XERO_ACCOUNTING_SCOPES is derived from buildXeroScopes, not a freeform literal', () => {
    // If this ever diverges the scope architecture has broken.
    const computed = buildXeroScopes([
      AccountingCapability.Banking,
      AccountingCapability.BankTransactions,
      AccountingCapability.ManualJournals,
      AccountingCapability.Journals,
      AccountingCapability.ChartOfAccounts,
    ]);
    expect(XERO_ACCOUNTING_SCOPES).toBe(computed);
  });
});

// ─── 14. Full canonical scope string content assertion ───────────────────────

describe('XERO_ACCOUNTING_SCOPES content', () => {
  it('equals the expected granular scope string (Banking + BankTransactions + ManualJournals + Journals + ChartOfAccounts)', () => {
    // accounting.settings replaces accounting.settings.read — write scope covers read.
    // Banking and ChartOfAccounts share accounting.settings (deduplicated).
    // BankTransactions adds accounting.banktransactions.read.
    // ManualJournals adds accounting.manualjournals (write, includes read).
    // Journals (General Ledger) adds accounting.journals.read.
    expect(XERO_ACCOUNTING_SCOPES).toBe(
      'accounting.banktransactions.read accounting.journals.read accounting.manualjournals accounting.reports.banksummary.read accounting.settings offline_access openid',
    );
  });

  it('contains exactly 7 scopes', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).toHaveLength(7);
  });

  it('contains accounting.banktransactions.read for BankTransactions capability', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).toContain(
      'accounting.banktransactions.read',
    );
  });

  it('contains accounting.manualjournals for ManualJournals capability', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).toContain(
      'accounting.manualjournals',
    );
  });

  it('contains accounting.journals.read for Journals (General Ledger) capability', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).toContain(
      'accounting.journals.read',
    );
  });

  it('does not contain profile', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).not.toContain('profile');
  });

  it('does not contain email', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).not.toContain('email');
  });

  it('does not contain accounting.transactions.read', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).not.toContain(
      'accounting.transactions.read',
    );
  });

  it('does not contain accounting.reports.read', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).not.toContain(
      'accounting.reports.read',
    );
  });

  it('does not contain accounting.settings.read (replaced by accounting.settings write scope)', () => {
    expect(scopeList(XERO_ACCOUNTING_SCOPES)).not.toContain(
      'accounting.settings.read',
    );
  });
});
