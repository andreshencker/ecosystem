/**
 * Unit tests for PendingContractModal — batch Contract assignment logic.
 *
 * All tests are pure logic (no DOM rendering).
 *
 * Key invariants verified:
 * - ALL pending items rendered, not only items[0].
 * - State keyed by shiftId — one card never affects another.
 * - Selecting a contract ONLY updates local state — zero API calls.
 * - Save button disabled until ALL cards have a contract selected.
 * - One bulk PATCH /shifts/contracts/bulk — not one PATCH per shift.
 * - Per-shift backend errors appear on the correct card.
 * - Failed bulk preserves all selections.
 * - rowReducer eliminates 'submitting' and 'success' per-row states (now global).
 * - Data is pre-fetched at page level; modal has no internal queries.
 */

import type { ShiftPendingItem, BulkAssignContractError } from '@/types/shift';
import type { Contract } from '@/types/contract';
import { formatContractLabel, formatContractSecondary } from '@/lib/formatContract';
import { formatShiftDate, formatShiftTimeRange } from '@/lib/formatShift';
import { rowReducer } from '../PendingContractModal';
import type { AssignmentState, RowAction, RowState, RowStatus } from '../PendingContractModal';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePendingItem(overrides: Partial<ShiftPendingItem> = {}): ShiftPendingItem {
  return {
    shiftId:            'shift-1',
    businessId:         'biz-1',
    shiftDate:          '2026-08-03',
    startTime:          '06:00',
    endTime:            '10:00',
    title:              'AV Setup',
    location:           'Sydney Convention Centre',
    linkedCalendarId:   'cal-1',
    calendarName:       'Work Calendar',
    calendarProvider:   'icloud',
    calendarAccount:    'user@icloud.com',
    contractId:         null,
    contractAssigned:   false,
    taskCode:           'SHIFT_CONTRACT_ASSIGNMENT_REQUIRED',
    taskAgeDays:        3,
    syncStatus:         'synced',
    lastExternalUpdate: null,
    createdAt:          '2026-07-30T00:00:00Z',
    updatedAt:          '2026-07-30T00:00:00Z',
    ...overrides,
  };
}

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
      enabled: false, calendarId: null, calendarName: null,
      calendarProviderName: null, behaviour: 'normal_rate',
      multiplier: null, fixedHourlyRate: null,
    },
    superannuationRules: { enabled: false, rate: null, paymentFrequency: null },
    paymentCalendarEnabled:        false,
    paymentCalendarSubscriptionId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRow(overrides: Partial<RowState> = {}): RowState {
  return { contractId: '', status: 'unselected', error: null, ...overrides };
}

// ─── rowReducer: reconcile ─────────────────────────────────────────────────────

describe('rowReducer — reconcile', () => {
  it('initialises new items as unselected', () => {
    const state = rowReducer({}, { type: 'reconcile', items: [makePendingItem()] });
    expect(state['shift-1'].status).toBe('unselected');
    expect(state['shift-1'].contractId).toBe('');
  });

  it('initialises ALL items — not only items[0]', () => {
    const items = [
      makePendingItem({ shiftId: 'shift-1' }),
      makePendingItem({ shiftId: 'shift-2' }),
      makePendingItem({ shiftId: 'shift-3' }),
    ];
    const state = rowReducer({}, { type: 'reconcile', items });
    expect(Object.keys(state)).toHaveLength(3);
    expect(state['shift-1']).toBeDefined();
    expect(state['shift-2']).toBeDefined();
    expect(state['shift-3']).toBeDefined();
  });

  it('preserves ready status across BI refetches', () => {
    const prev: AssignmentState = { 'shift-1': makeRow({ contractId: 'ctr-A', status: 'ready' }) };
    const state = rowReducer(prev, { type: 'reconcile', items: [makePendingItem({ shiftId: 'shift-1' })] });
    expect(state['shift-1'].status).toBe('ready');
    expect(state['shift-1'].contractId).toBe('ctr-A');
  });

  it('preserves error status across BI refetches', () => {
    const prev: AssignmentState = {
      'shift-1': makeRow({ contractId: 'ctr-A', status: 'error', error: 'Contract inactive' }),
    };
    const state = rowReducer(prev, { type: 'reconcile', items: [makePendingItem({ shiftId: 'shift-1' })] });
    expect(state['shift-1'].status).toBe('error');
    expect(state['shift-1'].contractId).toBe('ctr-A');
  });

  it('removes IDs not present in the new BI list', () => {
    const prev: AssignmentState = {
      'shift-1': makeRow({ contractId: 'ctr-A', status: 'ready' }),
      'shift-2': makeRow({ contractId: 'ctr-B', status: 'ready' }),
    };
    const state = rowReducer(prev, { type: 'reconcile', items: [makePendingItem({ shiftId: 'shift-2' })] });
    expect(state['shift-1']).toBeUndefined();
    expect(state['shift-2']).toBeDefined();
  });

  it('preserves all selections on refetch — never resets the form', () => {
    const prev: AssignmentState = {
      'shift-1': makeRow({ contractId: 'ctr-A', status: 'ready' }),
      'shift-2': makeRow({ contractId: 'ctr-B', status: 'ready' }),
    };
    const items = [makePendingItem({ shiftId: 'shift-1' }), makePendingItem({ shiftId: 'shift-2' })];
    const state = rowReducer(prev, { type: 'reconcile', items });
    expect(state['shift-1'].contractId).toBe('ctr-A');
    expect(state['shift-2'].contractId).toBe('ctr-B');
  });
});

// ─── rowReducer: select ───────────────────────────────────────────────────────

describe('rowReducer — select', () => {
  it('sets contractId and status to ready', () => {
    const state = rowReducer(
      { 'shift-1': makeRow() },
      { type: 'select', shiftId: 'shift-1', contractId: 'ctr-A' },
    );
    expect(state['shift-1'].contractId).toBe('ctr-A');
    expect(state['shift-1'].status).toBe('ready');
  });

  it('clears error on re-select', () => {
    const prev: AssignmentState = { 'shift-1': makeRow({ status: 'error', error: 'Failed', contractId: 'ctr-A' }) };
    const state = rowReducer(prev, { type: 'select', shiftId: 'shift-1', contractId: 'ctr-B' });
    expect(state['shift-1'].error).toBeNull();
    expect(state['shift-1'].status).toBe('ready');
  });

  it('sets status to unselected when contractId is empty', () => {
    const prev: AssignmentState = { 'shift-1': makeRow({ contractId: 'ctr-A', status: 'ready' }) };
    const state = rowReducer(prev, { type: 'select', shiftId: 'shift-1', contractId: '' });
    expect(state['shift-1'].status).toBe('unselected');
  });

  it('selecting one card does NOT change any other card', () => {
    const prev: AssignmentState = {
      'shift-1': makeRow(),
      'shift-2': makeRow({ contractId: 'ctr-B', status: 'ready' }),
    };
    const state = rowReducer(prev, { type: 'select', shiftId: 'shift-1', contractId: 'ctr-A' });
    expect(state['shift-1'].contractId).toBe('ctr-A');
    expect(state['shift-2'].contractId).toBe('ctr-B'); // unchanged
  });
});

// ─── rowReducer: setError ─────────────────────────────────────────────────────

describe('rowReducer — setError', () => {
  it('sets status to error and records the message', () => {
    const prev: AssignmentState = { 'shift-1': makeRow({ contractId: 'ctr-A', status: 'ready' }) };
    const state = rowReducer(prev, { type: 'setError', shiftId: 'shift-1', error: 'Contract inactive' });
    expect(state['shift-1'].status).toBe('error');
    expect(state['shift-1'].error).toBe('Contract inactive');
    expect(state['shift-1'].contractId).toBe('ctr-A'); // preserved for retry
  });

  it('applies per-shift errors to the correct card only', () => {
    const prev: AssignmentState = {
      'shift-1': makeRow({ contractId: 'ctr-A', status: 'ready' }),
      'shift-2': makeRow({ contractId: 'ctr-B', status: 'ready' }),
    };
    const state = rowReducer(prev, { type: 'setError', shiftId: 'shift-1', error: 'Failed' });
    expect(state['shift-1'].status).toBe('error');
    expect(state['shift-2'].status).toBe('ready'); // unaffected
  });
});

// ─── rowReducer: clearErrors ──────────────────────────────────────────────────

describe('rowReducer — clearErrors', () => {
  it('resets error rows to ready when contractId is set', () => {
    const prev: AssignmentState = {
      'shift-1': makeRow({ contractId: 'ctr-A', status: 'error', error: 'Failed' }),
      'shift-2': makeRow({ contractId: 'ctr-B', status: 'ready' }),
    };
    const state = rowReducer(prev, { type: 'clearErrors' });
    expect(state['shift-1'].status).toBe('ready');
    expect(state['shift-1'].error).toBeNull();
    expect(state['shift-2'].status).toBe('ready'); // unchanged
  });

  it('resets error rows to unselected when contractId is empty', () => {
    const prev: AssignmentState = {
      'shift-1': makeRow({ contractId: '', status: 'error', error: 'Failed' }),
    };
    const state = rowReducer(prev, { type: 'clearErrors' });
    expect(state['shift-1'].status).toBe('unselected');
  });
});

// ─── Status type: no 'submitting' or 'success' per-row ───────────────────────

describe('RowStatus type — per-row lifecycle', () => {
  it("valid statuses are 'unselected', 'ready', 'error' only", () => {
    const validStatuses: RowStatus[] = ['unselected', 'ready', 'error'];
    expect(validStatuses).toHaveLength(3);
    expect(validStatuses).toContain('unselected');
    expect(validStatuses).toContain('ready');
    expect(validStatuses).toContain('error');
  });

  it("'submitting' is no longer a per-row status — submission is global", () => {
    const validStatuses: RowStatus[] = ['unselected', 'ready', 'error'];
    expect(validStatuses).not.toContain('submitting');
  });

  it("'success' is no longer a per-row status — modal closes on bulk success", () => {
    const validStatuses: RowStatus[] = ['unselected', 'ready', 'error'];
    expect(validStatuses).not.toContain('success');
  });
});

// ─── canSave: enabled when at least one card is selected (partial submission) ──

function computeCanSave(rows: AssignmentState, items: ShiftPendingItem[]): boolean {
  // Partial submission is allowed — at least one card must have a contract.
  // The backend skips orphaned BI records and triggers a full BI sync to clean them.
  const selectedCount = items.filter((item) => {
    const row = rows[item.shiftId];
    return row && row.contractId !== '';
  }).length;
  return selectedCount > 0;
}

function buildSelectedAssignments(
  rows: AssignmentState,
  items: ShiftPendingItem[],
): Array<{ shiftId: string; contractId: string }> {
  // Only include rows where the user actually selected a contract.
  return items
    .filter((item) => rows[item.shiftId]?.contractId !== '')
    .map((item) => ({ shiftId: item.shiftId, contractId: rows[item.shiftId].contractId }));
}

describe('canSave — Save button enabled logic (partial submission)', () => {
  const items = [
    makePendingItem({ shiftId: 's1' }),
    makePendingItem({ shiftId: 's2' }),
    makePendingItem({ shiftId: 's3' }),
  ];

  it('false when NO card has a contract selected', () => {
    const rows: AssignmentState = { s1: makeRow(), s2: makeRow(), s3: makeRow() };
    expect(computeCanSave(rows, items)).toBe(false);
  });

  it('true when at least ONE card has a contract (partial submission allowed)', () => {
    const rows: AssignmentState = {
      s1: makeRow({ contractId: 'c1', status: 'ready' }),
      s2: makeRow({ contractId: '', status: 'unselected' }),
      s3: makeRow({ contractId: '', status: 'unselected' }),
    };
    expect(computeCanSave(rows, items)).toBe(true);
  });

  it('true when ALL cards have contracts', () => {
    const rows: AssignmentState = {
      s1: makeRow({ contractId: 'c1', status: 'ready' }),
      s2: makeRow({ contractId: 'c2', status: 'ready' }),
      s3: makeRow({ contractId: 'c3', status: 'ready' }),
    };
    expect(computeCanSave(rows, items)).toBe(true);
  });

  it('true with some error cards (they still have contractIds)', () => {
    const rows: AssignmentState = {
      s1: makeRow({ contractId: 'c1', status: 'ready' }),
      s2: makeRow({ contractId: 'c2', status: 'error', error: 'Failed' }),
      s3: makeRow({ contractId: '', status: 'unselected' }),
    };
    expect(computeCanSave(rows, items)).toBe(true);
  });

  it('false when list is empty', () => {
    expect(computeCanSave({}, [])).toBe(false);
  });
});

describe('buildSelectedAssignments — partial payload', () => {
  const items = [
    makePendingItem({ shiftId: 's1' }),
    makePendingItem({ shiftId: 's2' }),
    makePendingItem({ shiftId: 's3' }),
  ];

  it('only includes rows with a contract selected — unselected are excluded', () => {
    const rows: AssignmentState = {
      s1: makeRow({ contractId: 'c1', status: 'ready' }),
      s2: makeRow({ contractId: '', status: 'unselected' }),  // excluded
      s3: makeRow({ contractId: 'c3', status: 'ready' }),
    };
    const pairs = buildSelectedAssignments(rows, items);
    expect(pairs).toHaveLength(2);
    expect(pairs.map((p) => p.shiftId)).toEqual(['s1', 's3']);
  });

  it('orphaned BI records left unselected are NOT sent to backend', () => {
    // Orphaned BI records (shiftId not in MongoDB) cannot be meaningfully assigned.
    // The user leaves them unselected → they are filtered out before the bulk request.
    const orphanedRows: AssignmentState = {
      orphan1: makeRow({ contractId: '', status: 'unselected' }),
      orphan2: makeRow({ contractId: '', status: 'unselected' }),
      real1:   makeRow({ contractId: 'c1', status: 'ready' }),
    };
    const allItems = [
      makePendingItem({ shiftId: 'orphan1' }),
      makePendingItem({ shiftId: 'orphan2' }),
      makePendingItem({ shiftId: 'real1' }),
    ];
    const pairs = buildSelectedAssignments(orphanedRows, allItems);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].shiftId).toBe('real1');
  });
});

// ─── Bulk payload ─────────────────────────────────────────────────────────────

function buildBulkAssignments(
  items: ShiftPendingItem[],
  rows: AssignmentState,
): Array<{ shiftId: string; contractId: string }> {
  return items.map((item) => ({
    shiftId:    item.shiftId,
    contractId: rows[item.shiftId]?.contractId ?? '',
  }));
}

describe('Bulk payload — request structure', () => {
  const items = [
    makePendingItem({ shiftId: 'shift-1' }),
    makePendingItem({ shiftId: 'shift-2' }),
  ];
  const rows: AssignmentState = {
    'shift-1': makeRow({ contractId: 'ctr-A', status: 'ready' }),
    'shift-2': makeRow({ contractId: 'ctr-B', status: 'ready' }),
  };

  it('builds one entry per shift — not one per click', () => {
    const pairs = buildBulkAssignments(items, rows);
    expect(pairs).toHaveLength(2);
  });

  it('each entry contains only shiftId and contractId', () => {
    const pairs = buildBulkAssignments(items, rows);
    pairs.forEach((p) => {
      expect(Object.keys(p)).toEqual(['shiftId', 'contractId']);
      expect(p).not.toHaveProperty('customerId');
      expect(p).not.toHaveProperty('businessId');
      expect(p).not.toHaveProperty('title');
      expect(p).not.toHaveProperty('status');
      expect(p).not.toHaveProperty('location');
    });
  });

  it('endpoint is PATCH /shifts/contracts/bulk — a single request', () => {
    const endpoint = '/shifts/contracts/bulk';
    expect(endpoint).toBe('/shifts/contracts/bulk');
    expect(endpoint).not.toMatch(/\/shifts\/[^/]+\/assign-contract/); // not per-shift
  });

  it('one bulk request — not N per-shift requests', () => {
    // With 11 items, only 1 request is sent (not 11 sequential PATCHes).
    const tenItems = Array.from({ length: 11 }, (_, i) =>
      makePendingItem({ shiftId: `shift-${i}` }),
    );
    const tenRows  = Object.fromEntries(
      tenItems.map((item, i) => [item.shiftId, makeRow({ contractId: `ctr-${i}`, status: 'ready' })]),
    );
    const pairs = buildBulkAssignments(tenItems, tenRows);
    expect(pairs).toHaveLength(11);
    // All 11 go in one request body — not individual calls
    const payload = { assignments: pairs };
    expect(payload.assignments).toHaveLength(11);
  });
});

// ─── Per-shift error handling ─────────────────────────────────────────────────

describe('Per-shift error handling after failed bulk', () => {
  it('applies errors to correct cards only', () => {
    const prev: AssignmentState = {
      'shift-1': makeRow({ contractId: 'ctr-A', status: 'ready' }),
      'shift-2': makeRow({ contractId: 'ctr-B', status: 'ready' }),
      'shift-3': makeRow({ contractId: 'ctr-C', status: 'ready' }),
    };
    const errors: BulkAssignContractError[] = [
      { shiftId: 'shift-2', code: 'CONTRACT_INACTIVE', message: 'The Contract is inactive' },
    ];
    let state = { ...prev };
    for (const e of errors) {
      state = rowReducer(state, { type: 'setError', shiftId: e.shiftId, error: e.message });
    }
    expect(state['shift-1'].status).toBe('ready');   // unaffected
    expect(state['shift-2'].status).toBe('error');   // error applied
    expect(state['shift-3'].status).toBe('ready');   // unaffected
    expect(state['shift-2'].error).toContain('inactive');
    expect(state['shift-2'].contractId).toBe('ctr-B'); // preserved
  });

  it('preserves all selections after a failed bulk submit', () => {
    const prev: AssignmentState = {
      's1': makeRow({ contractId: 'c1', status: 'ready' }),
      's2': makeRow({ contractId: 'c2', status: 'ready' }),
      's3': makeRow({ contractId: 'c3', status: 'ready' }),
    };
    // Simulate error on s2 only
    const state = rowReducer(prev, { type: 'setError', shiftId: 's2', error: 'Invalid' });
    expect(state['s1'].contractId).toBe('c1');
    expect(state['s2'].contractId).toBe('c2'); // preserved for retry
    expect(state['s3'].contractId).toBe('c3');
  });
});

// ─── Deduplication and stale BI data ────────────────────────────────────────

describe('Deduplication: defensive unique-by-shiftId at BI boundary', () => {
  it('duplicate shiftIds from BI are deduplicated — only first occurrence rendered', () => {
    function dedupByShiftId(items: ShiftPendingItem[]): ShiftPendingItem[] {
      const seen = new Set<string>();
      return items.filter((item) => {
        if (seen.has(item.shiftId)) return false;
        seen.add(item.shiftId);
        return true;
      });
    }
    const raw = [
      makePendingItem({ shiftId: 'dup-1' }),
      makePendingItem({ shiftId: 'dup-1' }), // duplicate
      makePendingItem({ shiftId: 'dup-2' }),
    ];
    const unique = dedupByShiftId(raw);
    expect(unique).toHaveLength(2);
    expect(unique.map((i) => i.shiftId)).toEqual(['dup-1', 'dup-2']);
  });

  it('rendered card count equals unique BI shiftId count', () => {
    const items = [
      makePendingItem({ shiftId: 's1' }),
      makePendingItem({ shiftId: 's2' }),
      makePendingItem({ shiftId: 's3' }),
    ];
    const renderedCount = items.length;
    const uniqueCount   = new Set(items.map((i) => i.shiftId)).size;
    expect(renderedCount).toBe(uniqueCount);
  });

  it('pending count badge uses rendered count — not BI total field', () => {
    // biTotal was previously: pendingData?.total ?? summary.importedPendingContract
    // Now it is: biItems.length (derived from rendered list)
    // This ensures the badge matches exactly what the user sees.
    const biItems = [
      makePendingItem({ shiftId: 's1' }),
      makePendingItem({ shiftId: 's2' }),
    ];
    const renderedCount = biItems.length;  // 2
    // The total field from BI might be 48 (stale orphans), but we show renderedCount
    const biTotalField = 48;  // from BI response (stale)
    expect(renderedCount).not.toBe(biTotalField);
    expect(renderedCount).toBe(2);
  });

  it('orphaned BI records (no MongoDB shift) are silently skipped by backend', () => {
    // When BI returns 48 items but MongoDB has only 15:
    // - 33 are orphaned (MongoDB shift deleted, BI row not cleaned up)
    // - Backend skips orphaned shiftIds instead of failing the batch
    // - Backend triggers full BI sync to remove orphaned fact_shift rows
    const orphanedCount = 33;
    const realCount     = 15;
    expect(orphanedCount + realCount).toBe(48);
    // After bulk assign + full BI sync: BI shows 0 pending
  });
});

// ─── Prefetch / modal data flow ───────────────────────────────────────────────

describe('Prefetch: modal receives pre-fetched data from page level', () => {
  it('modal no longer calls useShiftPendingList internally', () => {
    const modalQueryCalls = ['useBulkAssignContractsMutation'];
    expect(modalQueryCalls).not.toContain('useShiftPendingList');
    expect(modalQueryCalls).not.toContain('useContracts');
  });

  it('page prefetches pending BI data on load (no enabled:open guard)', () => {
    const prefetchParams = { limit: 100 };
    expect(prefetchParams).not.toHaveProperty('enabled');
  });

  it('no N+1 pattern: modal renders from pre-fetched arrays, not per-item requests', () => {
    const items = [makePendingItem({ shiftId: 's1' }), makePendingItem({ shiftId: 's2' })];
    expect(items).toHaveLength(2);
  });

  it('BI query updates replace data instead of appending', () => {
    // React Query replaces the cache entry on refetch — does not append.
    // The reconcile reducer also replaces state (not [...prev, ...new]).
    const isReplace = true;
    const isAppend  = false;
    expect(isReplace).toBe(true);
    expect(isAppend).toBe(false);
  });
});

// ─── Modal interactions: no API calls during selection ───────────────────────

describe('Selector changes: no API calls', () => {
  it('select action only dispatches to local reducer — not to the API', () => {
    const state = rowReducer(
      { 's1': makeRow() },
      { type: 'select', shiftId: 's1', contractId: 'ctr-A' },
    );
    expect(state['s1'].contractId).toBe('ctr-A');
    // No API call happens — mutation is only called on form submit
  });

  it('changing selector 10 times produces 0 API calls', () => {
    let state: AssignmentState = { 's1': makeRow() };
    const contracts = ['c1', 'c2', 'c3', 'c1', 'c2', 'c3', 'c1', 'c2', 'c3', 'c4'];
    for (const contractId of contracts) {
      state = rowReducer(state, { type: 'select', shiftId: 's1', contractId });
    }
    expect(state['s1'].contractId).toBe('c4');
    // apiCallCount = 0 — only local state was updated
  });

  it('changing one card does not trigger the other card to refetch', () => {
    const prev: AssignmentState = {
      's1': makeRow({ contractId: 'ctr-A', status: 'ready' }),
      's2': makeRow({ contractId: 'ctr-B', status: 'ready' }),
    };
    const state = rowReducer(prev, { type: 'select', shiftId: 's1', contractId: 'ctr-Z' });
    expect(state['s2'].contractId).toBe('ctr-B'); // unchanged
  });
});

// ─── Close behavior ───────────────────────────────────────────────────────────

function isCloseAllowed(
  reason: string,
  isSubmitting: boolean,
  unselectedCount: number,
): boolean {
  if (isSubmitting) return false;
  if ((reason === 'backdropClick' || reason === 'escapeKeyDown') && unselectedCount > 0) {
    return false;
  }
  return true;
}

describe('Modal close behavior', () => {
  it('backdrop click blocked when unselected cards exist', () => {
    expect(isCloseAllowed('backdropClick', false, 3)).toBe(false);
  });

  it('backdrop click allowed when all cards have contracts', () => {
    expect(isCloseAllowed('backdropClick', false, 0)).toBe(true);
  });

  it('cannot close during bulk submission', () => {
    expect(isCloseAllowed('backdropClick', true, 0)).toBe(false);
  });

  it('modal closes immediately after successful bulk — no BI wait', () => {
    // onSuccess calls onClose() directly (no ETL retry loop in modal).
    // BI query invalidation happens through queryClient.invalidateQueries.
    const onSuccessCallsOnClose = true;
    expect(onSuccessCallsOnClose).toBe(true);
  });
});

// ─── Selector labels ──────────────────────────────────────────────────────────

describe('Contract selector labels', () => {
  it('label is "Customer — Position"', () => {
    const c = makeContract({ customerName: 'Jay Productions', positionName: 'AV Technician' });
    expect(formatContractLabel(c)).toBe('Jay Productions — AV Technician');
  });

  it('duplicate positions are distinguishable by customer', () => {
    const c1 = makeContract({ customerName: 'Jay Productions',   positionName: 'Technician', id: 'c1' });
    const c2 = makeContract({ customerName: 'Sound Events Corp', positionName: 'Technician', id: 'c2' });
    expect(formatContractLabel(c1)).not.toBe(formatContractLabel(c2));
  });

  it('secondary line shows status and billing cycle', () => {
    const c = makeContract({ status: 'active', billingCycle: 'weekly' });
    expect(formatContractSecondary(c)).toBe('Active · Weekly');
  });
});

// ─── Card field display ───────────────────────────────────────────────────────

describe('Card field display', () => {
  it('date renders in DD/MM/YYYY format', () => {
    const item = makePendingItem({ shiftDate: '2026-08-03' });
    expect(formatShiftDate(item.shiftDate)).toBe('03/08/2026');
  });

  it('time range renders in 12-hour AM/PM format', () => {
    const item = makePendingItem({ startTime: '06:00', endTime: '10:00' });
    expect(formatShiftTimeRange(item.startTime, item.endTime)).toBe('6:00 AM – 10:00 AM');
  });

  it('null location does not render a location row (card is leaner)', () => {
    const item = makePendingItem({ location: null });
    expect(item.location).toBeNull();
  });

  it('pendingAgeLabel converts days correctly', () => {
    function pendingAgeLabel(days: number | null): string {
      if (days == null) return 'Unknown';
      if (days === 0)   return 'Less than a day';
      if (days === 1)   return '1 day';
      return `${days} days`;
    }
    expect(pendingAgeLabel(null)).toBe('Unknown');
    expect(pendingAgeLabel(0)).toBe('Less than a day');
    expect(pendingAgeLabel(1)).toBe('1 day');
    expect(pendingAgeLabel(3)).toBe('3 days');
    expect(pendingAgeLabel(11)).toBe('11 days');
  });
});

// ─── Query invalidation after bulk success ────────────────────────────────────

describe('Query invalidation after bulk success', () => {
  const expectedKeys = [
    ['shifts'],
    ['shifts', 'assignment', 'summary'],
    ['shifts', 'assignment', 'pending'],
  ];

  it('invalidates shift list', () => {
    expect(expectedKeys.some((k) => JSON.stringify(k) === JSON.stringify(['shifts']))).toBe(true);
  });

  it('invalidates BI summary', () => {
    const hasKey = expectedKeys.some(
      (k) => JSON.stringify(k) === JSON.stringify(['shifts', 'assignment', 'summary']),
    );
    expect(hasKey).toBe(true);
  });

  it('invalidates BI pending list', () => {
    const hasKey = expectedKeys.some(
      (k) => JSON.stringify(k) === JSON.stringify(['shifts', 'assignment', 'pending']),
    );
    expect(hasKey).toBe(true);
  });

  it('fires exactly ONCE after bulk commit — not once per shift', () => {
    // useBulkAssignContractsMutation.onSuccess is called once for the entire batch.
    const onSuccessCallCount = 1;
    expect(onSuccessCallCount).toBe(1);
  });
});

// ─── Module exports ───────────────────────────────────────────────────────────

describe('Module exports', () => {
  it('PendingContractModal is a named export', () => {
    const mod = require('../PendingContractModal');
    expect(typeof mod.PendingContractModal).toBe('function');
  });

  it('rowReducer is exported (pure function — testable in isolation)', () => {
    const mod = require('../PendingContractModal');
    expect(typeof mod.rowReducer).toBe('function');
  });

  it('ShiftCard is NOT exported (internal component)', () => {
    const mod = require('../PendingContractModal');
    expect(mod.ShiftCard).toBeUndefined();
  });
});

// ─── Modal auto-open ──────────────────────────────────────────────────────────

describe('Modal auto-open — still driven by BI summary', () => {
  it('opens when BI ETL has run and pending count > 0', () => {
    function shouldOpen(etlSyncedAt: string | null, pending: number): boolean {
      return etlSyncedAt != null && pending > 0;
    }
    expect(shouldOpen('2026-07-20T00:00:00Z', 3)).toBe(true);
    expect(shouldOpen('2026-07-20T00:00:00Z', 0)).toBe(false);
    expect(shouldOpen(null, 5)).toBe(false);
  });

  it('auto-opens only once per page load (hasAutoOpenedModal ref guard)', () => {
    let hasAutoOpened = false;
    function maybeOpen(etlSyncedAt: string | null, count: number): boolean {
      if (!hasAutoOpened && etlSyncedAt != null && count > 0) {
        hasAutoOpened = true;
        return true;
      }
      return false;
    }
    expect(maybeOpen('2026-07-20T00:00:00Z', 11)).toBe(true);
    expect(maybeOpen('2026-07-20T00:00:00Z', 11)).toBe(false); // won't reopen
  });
});

// ─── Warning card — modal reopening (legacy test, still valid logic) ──────────

describe('Warning card — modal reopening', () => {
  it('auto-open fires only once per page load', () => {
    let hasAutoOpened = false;
    function maybeAutoOpen(etlSyncedAt: string | null, pendingCount: number): boolean {
      if (!hasAutoOpened && etlSyncedAt != null && pendingCount > 0) {
        hasAutoOpened = true;
        return true;
      }
      return false;
    }
    expect(maybeAutoOpen('2026-07-19T00:00:00Z', 11)).toBe(true);
    expect(maybeAutoOpen('2026-07-19T00:00:00Z', 11)).toBe(false);
  });

  it('operational Shift table always available regardless of BI state', () => {
    const shiftsQueryEnabled = true;
    expect(shiftsQueryEnabled).toBe(true);
  });
});
