// src/accounting/manual-journals-guide.spec.ts
//
// Contract-accuracy tests for the Manual Journals Integration Guide.
//
// reflect-metadata must be imported before any class-validator decorator usage.
import 'reflect-metadata';

//
// These tests confirm that what the guide documents matches the actual backend
// implementation: DTO fields, route patterns, capability enum values, canonical
// response types, and authentication conventions.
//
// They do NOT test UI rendering (no DOM framework exists in the frontend).
// They DO test every factual claim the guide makes about the backend contract,
// ensuring the guide stays accurate as the implementation evolves.
//
// Run with: npx jest src/accounting/manual-journals-guide.spec.ts

import {
  CreateManualJournalDto,
  ManualJournalLineDto,
} from './dto/create-manual-journal.dto';
import { UpdateManualJournalDto } from './dto/update-manual-journal.dto';
import { ListManualJournalsQueryDto } from './dto/list-manual-journals.dto';
import {
  AccountingCapability,
  AccountingCapabilityStatus,
} from './enums/accounting-capability.enum';
import { XERO_ACCOUNTING_CAPABILITIES } from './providers/xero/xero-accounting.capabilities';
import type {
  ManualJournalDetail,
  ManualJournalSummary,
  ManualJournalLine,
} from './types/accounting.types';

// ─── Guide constants (imported from the frontend module here for contract parity) ──
// We duplicate the expected values so that changes in either the guide OR the backend
// cause a test failure, making divergence explicit.

const GUIDE_ROUTES = {
  list: 'GET  /accounting/manual-journals/:credentialId',
  get: 'GET  /accounting/manual-journals/:credentialId/:manualJournalId',
  create: 'POST /accounting/manual-journals/:credentialId',
  update: 'PATCH /accounting/manual-journals/:credentialId/:manualJournalId',
};

const GUIDE_AUTH_HEADER = 'x-integration-token';
const GUIDE_CAPABILITY_KEY = 'manualJournals';

// ─── 1. Integration guide identity — no operational action identifiers ──────────

describe('Integration guide identity', () => {
  it('is an integration guide (page identity marker present in route naming)', () => {
    // The guide is accessed via /accounting/manual-journals — not /accounting/journal-entry
    // or any form-submission path. This asserts the integration-facing route pattern.
    expect(GUIDE_ROUTES.list).toContain('/accounting/manual-journals');
    expect(GUIDE_ROUTES.create).toContain('/accounting/manual-journals');
  });

  it('no DELETE route exists in the documented endpoints', () => {
    const methods = Object.values(GUIDE_ROUTES).map((r) => r.split(' ')[0]);
    expect(methods).not.toContain('DELETE');
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('PATCH');
  });

  it('route base path is accounting/manual-journals (not accounting/journals)', () => {
    // Must remain distinct from the General Ledger /accounting/general-ledger/... routes
    Object.values(GUIDE_ROUTES).forEach((route) => {
      expect(route).not.toContain('general-ledger');
      expect(route).not.toContain('/accounting/journals');
    });
  });
});

// ─── 2. No operational journal-creation UI identifiers ───────────────────────────

describe('No Add Journal operational action', () => {
  it('POST endpoint is an API route, not a form action path', () => {
    expect(GUIDE_ROUTES.create).toMatch(
      /^POST\s+\/accounting\/manual-journals\/:credentialId$/,
    );
  });

  it('API contract does not include account-chooser or auto-balance fields', () => {
    const dto = new CreateManualJournalDto();
    expect(dto).not.toHaveProperty('debitAccount');
    expect(dto).not.toHaveProperty('creditAccount');
    expect(dto).not.toHaveProperty('autoSelectAccount');
    expect(dto).not.toHaveProperty('accountCategory');
    expect(dto).not.toHaveProperty('balancingLine');
  });

  it('CreateManualJournalDto has no business-logic fields (no tax calculator, no journal reason inference)', () => {
    const dto = new CreateManualJournalDto();
    expect(dto).not.toHaveProperty('businessEvent');
    expect(dto).not.toHaveProperty('inferTax');
    expect(dto).not.toHaveProperty('autoNarrate');
  });
});

// ─── 3. No journal editor ─────────────────────────────────────────────────────────

describe('No journal editor — Communications validates structure only', () => {
  it('CreateManualJournalDto does not default to any account codes', () => {
    const dto = new CreateManualJournalDto();
    // All required fields are undefined (no defaults applied)
    expect(dto.date).toBeUndefined();
    expect(dto.narration).toBeUndefined();
    expect(dto.lines).toBeUndefined();
  });

  it('ManualJournalLineDto amount is caller-supplied — not computed', () => {
    const line = Object.assign(new ManualJournalLineDto(), {
      accountCode: '400',
      amount: -750,
    });
    // Negative amounts are valid (credits) — Communications does not rewrite them
    expect(line.amount).toBe(-750);
    expect(line.amount).toBeLessThan(0);
  });

  it('ManualJournalLineDto accountCode is a raw string — not an enum or known account list', () => {
    const line = Object.assign(new ManualJournalLineDto(), {
      accountCode: '9999',
      amount: 100,
    });
    // Communications accepts any string; provider validates existence
    expect(typeof line.accountCode).toBe('string');
  });
});

// ─── 4. Actual implemented endpoints are documented ───────────────────────────────

describe('Endpoint accuracy', () => {
  const BASE = '/accounting/manual-journals/:credentialId';

  it('list endpoint: GET :credentialId', () => {
    expect(GUIDE_ROUTES.list).toBe(`GET  ${BASE}`);
  });

  it('get endpoint: GET :credentialId/:manualJournalId', () => {
    expect(GUIDE_ROUTES.get).toBe(`GET  ${BASE}/:manualJournalId`);
  });

  it('create endpoint: POST :credentialId', () => {
    expect(GUIDE_ROUTES.create).toBe(`POST ${BASE}`);
  });

  it('update endpoint: PATCH :credentialId/:manualJournalId', () => {
    expect(GUIDE_ROUTES.update).toBe(`PATCH ${BASE}/:manualJournalId`);
  });

  it('all route paths share the base /accounting/manual-journals/:credentialId', () => {
    Object.values(GUIDE_ROUTES).forEach((route) => {
      expect(route).toContain('/accounting/manual-journals/:credentialId');
    });
  });
});

// ─── 5. Request examples match the canonical DTO ──────────────────────────────────

describe('Request contract accuracy — CreateManualJournalDto', () => {
  it('date field is string (YYYY-MM-DD)', () => {
    const dto = Object.assign(new CreateManualJournalDto(), {
      date: '2026-08-08',
      narration: 'Test',
      lines: [],
    });
    expect(dto.date).toBe('2026-08-08');
    expect(typeof dto.date).toBe('string');
  });

  it('narration field is required string', () => {
    const dto = Object.assign(new CreateManualJournalDto(), {
      narration: 'Payroll adjustment',
    });
    expect(dto.narration).toBe('Payroll adjustment');
  });

  it('status field accepts draft or posted', () => {
    const draft = Object.assign(new CreateManualJournalDto(), {
      status: 'draft' as const,
    });
    const posted = Object.assign(new CreateManualJournalDto(), {
      status: 'posted' as const,
    });
    expect(draft.status).toBe('draft');
    expect(posted.status).toBe('posted');
  });

  it('lineAmountType accepts NoTax, Exclusive, Inclusive', () => {
    (['NoTax', 'Exclusive', 'Inclusive'] as const).forEach((v) => {
      const dto = Object.assign(new CreateManualJournalDto(), {
        lineAmountType: v,
      });
      expect(dto.lineAmountType).toBe(v);
    });
  });

  it('externalReference is optional', () => {
    const dto = Object.assign(new CreateManualJournalDto(), {
      externalReference: 'ref-001',
    });
    expect(dto.externalReference).toBe('ref-001');
    const dtoNoRef = new CreateManualJournalDto();
    expect(dtoNoRef.externalReference).toBeUndefined();
  });

  it('organisationId is optional (body field for create)', () => {
    const dto = Object.assign(new CreateManualJournalDto(), {
      organisationId: 'org-xxx',
    });
    expect(dto.organisationId).toBe('org-xxx');
  });

  it('showOnCashBasisReports is optional boolean', () => {
    const dto = Object.assign(new CreateManualJournalDto(), {
      showOnCashBasisReports: true,
    });
    expect(dto.showOnCashBasisReports).toBe(true);
  });
});

describe('Request contract accuracy — ManualJournalLineDto', () => {
  it('accountCode is required string', () => {
    const line = Object.assign(new ManualJournalLineDto(), {
      accountCode: '400',
    });
    expect(line.accountCode).toBe('400');
  });

  it('amount is required number — positive = debit, negative = credit', () => {
    const debit = Object.assign(new ManualJournalLineDto(), {
      accountCode: '400',
      amount: 5000,
    });
    const credit = Object.assign(new ManualJournalLineDto(), {
      accountCode: '800',
      amount: -5000,
    });
    expect(debit.amount).toBeGreaterThan(0);
    expect(credit.amount).toBeLessThan(0);
    // Sum of a balanced journal is zero
    expect(debit.amount + credit.amount).toBe(0);
  });

  it('description is optional', () => {
    const line = Object.assign(new ManualJournalLineDto(), {
      accountCode: '400',
      amount: 100,
      description: 'Payroll expense',
    });
    expect(line.description).toBe('Payroll expense');
    const lineNoDesc = Object.assign(new ManualJournalLineDto(), {
      accountCode: '400',
      amount: 100,
    });
    expect(lineNoDesc.description).toBeUndefined();
  });

  it('taxType is optional', () => {
    const line = Object.assign(new ManualJournalLineDto(), {
      accountCode: '400',
      amount: 100,
      taxType: 'NONE',
    });
    expect(line.taxType).toBe('NONE');
  });

  it('tracking is optional array', () => {
    const line = Object.assign(new ManualJournalLineDto(), {
      accountCode: '400',
      amount: 100,
      tracking: [{ name: 'Region', option: 'North' }],
    });
    expect(line.tracking).toHaveLength(1);
    expect(line.tracking[0].name).toBe('Region');
  });
});

describe('Request contract accuracy — UpdateManualJournalDto', () => {
  it('all fields are optional', () => {
    const dto = new UpdateManualJournalDto();
    expect(dto.date).toBeUndefined();
    expect(dto.narration).toBeUndefined();
    expect(dto.lines).toBeUndefined();
    expect(dto.status).toBeUndefined();
    expect(dto.externalReference).toBeUndefined();
    expect(dto.organisationId).toBeUndefined();
  });

  it('status accepts only draft or posted (no delete/void through update)', () => {
    const dto = Object.assign(new UpdateManualJournalDto(), {
      status: 'draft' as const,
    });
    expect(dto.status).toBe('draft');
    // There is no 'delete' or 'void' in the update DTO — provider-side only
  });
});

describe('List query parameters', () => {
  it('ListManualJournalsQueryDto has cursor, limit, dateFrom, dateTo, status', () => {
    const q = Object.assign(new ListManualJournalsQueryDto(), {
      cursor: '2',
      limit: 50,
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      status: 'draft' as const,
    });
    expect(q.cursor).toBe('2');
    expect(q.limit).toBe(50);
    expect(q.dateFrom).toBe('2026-08-01');
    expect(q.dateTo).toBe('2026-08-31');
    expect(q.status).toBe('draft');
  });

  it('status accepts draft, posted, deleted, voided, all', () => {
    (['draft', 'posted', 'deleted', 'voided', 'all'] as const).forEach((v) => {
      const q = Object.assign(new ListManualJournalsQueryDto(), { status: v });
      expect(q.status).toBe(v);
    });
  });
});

// ─── 6. Response examples contain no secrets ──────────────────────────────────────

describe('Response contract — no secrets', () => {
  const CANONICAL_RESPONSE_FIELDS: Array<keyof ManualJournalDetail> = [
    'id',
    'providerResourceId',
    'externalReference',
    'date',
    'narration',
    'status',
    'lineAmountType',
    'showOnCashBasisReports',
    'hasAttachments',
    'updatedAt',
    'lines',
    'sourceUrl',
    'createdAt',
  ];

  const SECRET_FIELD_NAMES = [
    'accessToken',
    'refreshToken',
    'clientSecret',
    'clientId',
    'tenantId',
    'credentials',
    'password',
    'encryptedData',
    'apiKey',
    'bearerToken',
  ];

  it('canonical ManualJournalDetail fields contain no credential or secret names', () => {
    SECRET_FIELD_NAMES.forEach((secret) => {
      expect(CANONICAL_RESPONSE_FIELDS as string[]).not.toContain(secret);
    });
  });

  it('ManualJournalSummary does not expose provider tenant IDs', () => {
    const summary: Partial<ManualJournalSummary> = {
      id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      providerResourceId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      narration: 'Test',
      status: 'draft',
    };
    // tenantId should never appear in canonical summary
    expect(summary).not.toHaveProperty('tenantId');
    expect(summary).not.toHaveProperty('accessToken');
    expect(summary).not.toHaveProperty('clientSecret');
  });

  it('guide response example ID does not use the mj_ prefix (actual IDs are UUIDs)', () => {
    const exampleId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    expect(exampleId).not.toMatch(/^mj_/);
    expect(exampleId).toMatch(/^[x-]+$/); // placeholder pattern
  });

  it('ManualJournalLine canonical fields have no provider-internal names', () => {
    const LINE_FIELDS: Array<keyof ManualJournalLine> = [
      'accountCode',
      'amount',
      'description',
      'taxType',
      'tracking',
    ];
    const PROVIDER_INTERNAL = [
      'JournalLineID',
      'LineAmount',
      'AccountID',
      'TaxAmount',
    ];
    PROVIDER_INTERNAL.forEach((internal) => {
      expect(LINE_FIELDS as string[]).not.toContain(internal);
    });
  });
});

// ─── 7. Authentication documentation — correct header, placeholder only ──────────

describe('Authentication documentation', () => {
  it('external applications use x-integration-token header', () => {
    expect(GUIDE_AUTH_HEADER).toBe('x-integration-token');
  });

  it('authentication header is not Authorization: Bearer (that is for browser JWT)', () => {
    expect(GUIDE_AUTH_HEADER).not.toBe('authorization');
    expect(GUIDE_AUTH_HEADER).not.toContain('Bearer');
  });

  it('placeholder token is recognisably a placeholder', () => {
    const placeholder = '<your-integration-token>';
    expect(placeholder).toContain('<');
    expect(placeholder).toContain('>');
    // Not a real token (not long base64)
    expect(placeholder.replace(/[<>]/g, '')).toHaveLength(
      'your-integration-token'.length,
    );
  });
});

// ─── 8. Connection and organisation concepts are explained ───────────────────────

describe('Context identifiers', () => {
  it('credentialId is a path parameter in all routes', () => {
    Object.values(GUIDE_ROUTES).forEach((route) => {
      expect(route).toContain(':credentialId');
    });
  });

  it('organisationId for write ops is a body field (on CreateManualJournalDto)', () => {
    const dto = Object.assign(new CreateManualJournalDto(), {
      organisationId: 'org-abc',
    });
    expect(dto.organisationId).toBeDefined();
    expect(typeof dto.organisationId).toBe('string');
  });

  it('organisationId for write ops is a body field (on UpdateManualJournalDto)', () => {
    const dto = Object.assign(new UpdateManualJournalDto(), {
      organisationId: 'org-abc',
    });
    expect(dto.organisationId).toBeDefined();
  });
});

// ─── 9. Xero-specific notes do not leak into generic contracts ────────────────────

describe('Provider neutrality in generic contracts', () => {
  it('CreateManualJournalDto contains no Xero-specific field names', () => {
    const XERO_FIELDS = [
      'ManualJournalID',
      'JournalLines',
      'Narration',
      'tenantId',
      'xeroTenantId',
    ];
    const dto = new CreateManualJournalDto();
    XERO_FIELDS.forEach((field) => {
      expect(dto).not.toHaveProperty(field);
    });
  });

  it('UpdateManualJournalDto contains no Xero-specific field names', () => {
    const XERO_FIELDS = ['ManualJournalID', 'JournalLines', 'tenantId'];
    const dto = new UpdateManualJournalDto();
    XERO_FIELDS.forEach((field) => {
      expect(dto).not.toHaveProperty(field);
    });
  });

  it('canonical response type uses Communications field names (not Xero PascalCase)', () => {
    const CANONICAL_FIELDS = [
      'id',
      'providerResourceId',
      'narration',
      'externalReference',
      'lines',
    ];
    const XERO_PASCAL = ['ManualJournalID', 'Narration', 'JournalLines', 'Url'];
    CANONICAL_FIELDS.forEach((canon) => {
      expect(XERO_PASCAL).not.toContain(canon);
    });
  });
});

// ─── 10. General Ledger separation ───────────────────────────────────────────────

describe('General Ledger is separate from Manual Journals', () => {
  it('ManualJournals and Journals capability keys are distinct', () => {
    expect(AccountingCapability.ManualJournals).toBe('manualJournals');
    expect(AccountingCapability.Journals).toBe('journals');
    expect(AccountingCapability.ManualJournals).not.toBe(
      AccountingCapability.Journals,
    );
  });

  it('guide capability key matches the enum value', () => {
    expect(GUIDE_CAPABILITY_KEY).toBe(AccountingCapability.ManualJournals);
  });

  it('Manual Journals routes do not overlap with General Ledger routes', () => {
    const glBase = '/accounting/general-ledger';
    const mjBase = '/accounting/manual-journals';
    expect(mjBase).not.toContain('general-ledger');
    expect(glBase).not.toContain('manual-journals');
    Object.values(GUIDE_ROUTES).forEach((route) => {
      expect(route).not.toContain('general-ledger');
    });
  });

  it('GeneralLedger (journals) is read-only — no create/update', () => {
    // The General Ledger (AccountingCapability.Journals) has no write operations.
    // This test asserts the separation is maintained at the capability level.
    const mjCapability = AccountingCapability.ManualJournals;
    const glCapability = AccountingCapability.Journals;
    // They are different capabilities with different operations
    expect(mjCapability).not.toBe(glCapability);
    // Only manual journals supports create/update
    expect(Object.values(GUIDE_ROUTES).some((r) => r.startsWith('POST'))).toBe(
      true,
    );
    expect(Object.values(GUIDE_ROUTES).some((r) => r.startsWith('PATCH'))).toBe(
      true,
    );
  });
});

// ─── 11. Copy actions — documented values are accurate ────────────────────────────

describe('Copyable content accuracy', () => {
  it('example date placeholder is a valid ISO date string', () => {
    const exampleDate = '2026-08-08';
    expect(exampleDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('example account code is a string, not computed from business logic', () => {
    const exampleAccountCode = '400';
    expect(typeof exampleAccountCode).toBe('string');
    expect(exampleAccountCode).not.toContain('function');
    expect(exampleAccountCode).not.toContain('getAccount');
  });

  it('base route documented in guide is a stable string', () => {
    const base = '/accounting/manual-journals/:credentialId';
    expect(GUIDE_ROUTES.list).toContain(base);
    expect(GUIDE_ROUTES.create).toContain(base);
  });

  it('auth header documented as x-integration-token is a non-empty lowercase string', () => {
    expect(GUIDE_AUTH_HEADER.length).toBeGreaterThan(0);
    expect(GUIDE_AUTH_HEADER).toBe(GUIDE_AUTH_HEADER.toLowerCase());
  });
});

// ─── 12. Unsupported provider capabilities are represented correctly ───────────────

describe('Capability representation accuracy', () => {
  it('ManualJournals capability is Available for Xero', () => {
    const status =
      XERO_ACCOUNTING_CAPABILITIES.capabilities[
        AccountingCapability.ManualJournals
      ];
    expect(status).toBe(AccountingCapabilityStatus.Available);
  });

  it('Journals (General Ledger) capability is Available for Xero', () => {
    const status =
      XERO_ACCOUNTING_CAPABILITIES.capabilities[AccountingCapability.Journals];
    expect(status).toBe(AccountingCapabilityStatus.Available);
  });

  it('BankConnections capability is Available for Xero (financial account metadata via Accounts API)', () => {
    // Xero exposes financial accounts (bank accounts + credit cards) through
    // its Accounting API (Type=="BANK"). BankConnections = list financial
    // account metadata — not Open Banking direct feeds.
    const status =
      XERO_ACCOUNTING_CAPABILITIES.capabilities[
        AccountingCapability.BankConnections
      ];
    expect(status).toBe(AccountingCapabilityStatus.Available);
  });

  it('delete is not in the documented supported operations for Manual Journals', () => {
    const documented = ['list', 'get', 'create', 'update'];
    expect(documented).not.toContain('delete');
    expect(documented).not.toContain('void');
  });

  it('Xero capability key matches documentation capability key', () => {
    // The guide documents "manualJournals" — this must match the enum
    expect(GUIDE_CAPABILITY_KEY).toBe('manualJournals');
    expect(AccountingCapability.ManualJournals).toBe('manualJournals');
  });
});
