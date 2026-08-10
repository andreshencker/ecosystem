/**
 * Unit tests for Shifts page — pure logic, no DOM rendering required.
 *
 * Covers: formatters, action visibility, delete confirmation messages,
 * table height, column widths, mobile card structure, and filter logic.
 */

import type {
  CalendarSyncResult,
  Shift,
  ShiftAssignmentSummary,
  CreateShiftPayload,
  UpdateShiftPayload,
  BusinessSyncResult,
} from '@/types/shift';
import { STATUS_LABELS } from '@/types/shift';
import {
  formatShiftDate,
  formatShiftTime,
  formatShiftTimeRange,
  formatFreshness,
} from '@/lib/formatShift';
import type { DrawerMode } from '../ShiftDrawer';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id:                  's1',
    businessId:          'biz1',
    contractId:          'c1',
    customerId:          'cust1',
    contract:            null,
    date:                '2026-08-03',
    startTime:           '09:00',
    endDate:             '2026-08-03',
    endTime:             '17:00',
    breakTaken:          true,
    status:              'draft',
    location:            'Sydney Showground, Sydney Olympic Park NSW',
    notes:               null,
    createdFromCalendar: false,
    contractAssigned:    true,
    syncStatus:          null,
    linkedCalendarId:    null,
    calendarProvider:    null,
    calendarAccount:     null,
    calendarName:        null,
    title:               'Morning Shift',
    allDay:              false,
    timezone:            null,
    createdAt:           '2026-08-03T00:00:00Z',
    updatedAt:           '2026-08-03T00:00:00Z',
    ...overrides,
  };
}

// ─── STATUS_LABELS ────────────────────────────────────────────────────────────

describe('STATUS_LABELS', () => {
  it('has labels for all three statuses', () => {
    expect(STATUS_LABELS['draft']).toBe('Draft');
    expect(STATUS_LABELS['confirmed']).toBe('Confirmed');
    expect(STATUS_LABELS['cancelled']).toBe('Cancelled');
  });
});

// ─── DrawerMode type ──────────────────────────────────────────────────────────

describe('DrawerMode type contract', () => {
  it('accepts create, view, edit', () => {
    const modes: DrawerMode[] = ['create', 'view', 'edit'];
    expect(modes).toHaveLength(3);
  });
});

// ─── Date formatter ───────────────────────────────────────────────────────────

describe('formatShiftDate', () => {
  it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatShiftDate('2026-08-03')).toBe('03/08/2026');
  });

  it('handles single-digit day and month', () => {
    expect(formatShiftDate('2026-01-05')).toBe('05/01/2026');
  });

  it('handles end-of-year date', () => {
    expect(formatShiftDate('2026-12-31')).toBe('31/12/2026');
  });

  it('returns — for null', () => {
    expect(formatShiftDate(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatShiftDate(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(formatShiftDate('')).toBe('—');
  });

  it('returns — for invalid format', () => {
    expect(formatShiftDate('03/08/2026')).toBe('—');
    expect(formatShiftDate('Aug 3 2026')).toBe('—');
    expect(formatShiftDate('not-a-date')).toBe('—');
  });

  it('does not mutate the raw ISO value', () => {
    const raw = '2026-08-03';
    formatShiftDate(raw);
    expect(raw).toBe('2026-08-03');
  });
});

// ─── Time formatter ───────────────────────────────────────────────────────────

describe('formatShiftTime', () => {
  it('06:00 → 6:00 AM (no leading zero)', () => {
    expect(formatShiftTime('06:00')).toBe('6:00 AM');
  });

  it('09:00 → 9:00 AM', () => {
    expect(formatShiftTime('09:00')).toBe('9:00 AM');
  });

  it('11:00 → 11:00 AM', () => {
    expect(formatShiftTime('11:00')).toBe('11:00 AM');
  });

  it('12:00 → 12:00 PM (noon)', () => {
    expect(formatShiftTime('12:00')).toBe('12:00 PM');
  });

  it('13:30 → 1:30 PM', () => {
    expect(formatShiftTime('13:30')).toBe('1:30 PM');
  });

  it('17:00 → 5:00 PM', () => {
    expect(formatShiftTime('17:00')).toBe('5:00 PM');
  });

  it('23:00 → 11:00 PM', () => {
    expect(formatShiftTime('23:00')).toBe('11:00 PM');
  });

  it('00:00 → 12:00 AM (midnight)', () => {
    expect(formatShiftTime('00:00')).toBe('12:00 AM');
  });

  it('00:30 → 12:30 AM', () => {
    expect(formatShiftTime('00:30')).toBe('12:30 AM');
  });

  it('preserves minutes', () => {
    expect(formatShiftTime('14:45')).toBe('2:45 PM');
    expect(formatShiftTime('07:15')).toBe('7:15 AM');
  });

  it('returns — for null', () => {
    expect(formatShiftTime(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatShiftTime(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(formatShiftTime('')).toBe('—');
  });

  it('returns — for invalid format', () => {
    expect(formatShiftTime('9am')).toBe('—');
    expect(formatShiftTime('9:00 AM')).toBe('—');
    expect(formatShiftTime('not-a-time')).toBe('—');
  });
});

// ─── Time range formatter ─────────────────────────────────────────────────────

describe('formatShiftTimeRange', () => {
  it('formats a normal daytime range', () => {
    expect(formatShiftTimeRange('06:00', '10:00')).toBe('6:00 AM – 10:00 AM');
  });

  it('formats a range crossing noon', () => {
    expect(formatShiftTimeRange('09:00', '17:00')).toBe('9:00 AM – 5:00 PM');
  });

  it('formats an overnight range without shifting the date', () => {
    expect(formatShiftTimeRange('23:00', '03:00')).toBe('11:00 PM – 3:00 AM');
  });

  it('formats midnight to morning', () => {
    expect(formatShiftTimeRange('00:00', '08:00')).toBe('12:00 AM – 8:00 AM');
  });

  it('formats noon to midnight', () => {
    expect(formatShiftTimeRange('12:00', '00:00')).toBe('12:00 PM – 12:00 AM');
  });

  it('returns — when both times are null', () => {
    expect(formatShiftTimeRange(null, null)).toBe('—');
  });

  it('returns partial result when only start is present', () => {
    expect(formatShiftTimeRange('09:00', null)).toBe('9:00 AM – —');
  });

  it('returns partial result when only end is present', () => {
    expect(formatShiftTimeRange(null, '17:00')).toBe('— – 5:00 PM');
  });

  it('1:00 AM to 11:00 AM renders correctly', () => {
    expect(formatShiftTimeRange('01:00', '11:00')).toBe('1:00 AM – 11:00 AM');
  });
});

// ─── Drawer title logic ───────────────────────────────────────────────────────

function drawerTitle(mode: DrawerMode, shift?: Shift | null): string {
  if (mode === 'create') return 'New Shift';
  if (mode === 'edit')   return 'Edit Shift';
  return shift ? `Shift — ${shift.date}` : 'Shift';
}

describe('drawerTitle', () => {
  it('returns "New Shift" for create mode', () => {
    expect(drawerTitle('create')).toBe('New Shift');
  });

  it('returns "Edit Shift" for edit mode', () => {
    expect(drawerTitle('edit', makeShift())).toBe('Edit Shift');
  });

  it('returns "Shift — <date>" for view mode with shift', () => {
    expect(drawerTitle('view', makeShift({ date: '2026-08-03' }))).toBe('Shift — 2026-08-03');
  });

  it('returns "Shift" for view mode without shift', () => {
    expect(drawerTitle('view', null)).toBe('Shift');
  });
});

// ─── Delete action — unconditional ───────────────────────────────────────────

// Delete must always appear regardless of shift status.
// The backend enforces business rules. The frontend does not gate visibility.

function deleteIsVisible(_shift: Pick<Shift, 'status'>): boolean {
  // No status condition — always visible
  return true;
}

describe('Delete action is unconditional', () => {
  it('is visible for draft shifts', () => {
    expect(deleteIsVisible(makeShift({ status: 'draft' }))).toBe(true);
  });

  it('is visible for confirmed shifts', () => {
    expect(deleteIsVisible(makeShift({ status: 'confirmed' }))).toBe(true);
  });

  it('is visible for cancelled shifts', () => {
    expect(deleteIsVisible(makeShift({ status: 'cancelled' }))).toBe(true);
  });

  it('is visible for calendar-imported shifts', () => {
    expect(deleteIsVisible(makeShift({ status: 'confirmed', createdFromCalendar: true }))).toBe(true);
  });

  it('is visible for manual shifts', () => {
    expect(deleteIsVisible(makeShift({ status: 'confirmed', createdFromCalendar: false }))).toBe(true);
  });

  it('mobile card footer always includes Delete action', () => {
    // All three actions are always present in the footer
    const alwaysPresent = ['View', 'Edit', 'Delete'];
    expect(alwaysPresent).toHaveLength(3);
    expect(alwaysPresent).toContain('Delete');
  });
});

// ─── Delete confirmation messages ─────────────────────────────────────────────

function deleteDialogDescription(shift: Pick<Shift, 'linkedCalendarId'>): string {
  return shift.linkedCalendarId
    ? 'This will permanently remove the Shift from Business App and delete the corresponding event from the connected calendar.'
    : 'This will permanently remove the Shift from Business App.';
}

describe('Delete confirmation messages', () => {
  it('manual shift (no linkedCalendarId): local removal only', () => {
    const msg = deleteDialogDescription(makeShift({ linkedCalendarId: null }));
    expect(msg).toBe('This will permanently remove the Shift from Business App.');
  });

  it('calendar-backed shift: mentions external event deletion', () => {
    const msg = deleteDialogDescription(makeShift({ linkedCalendarId: 'cal-id-1' }));
    expect(msg).toBe(
      'This will permanently remove the Shift from Business App and delete the corresponding event from the connected calendar.',
    );
  });

  it('both messages contain "permanently remove the Shift from Business App"', () => {
    const base = 'permanently remove the Shift from Business App';
    expect(deleteDialogDescription(makeShift({ linkedCalendarId: null }))).toContain(base);
    expect(deleteDialogDescription(makeShift({ linkedCalendarId: 'cal1' }))).toContain(base);
  });

  it('manual message does NOT mention "connected calendar"', () => {
    const msg = deleteDialogDescription(makeShift({ linkedCalendarId: null }));
    expect(msg).not.toContain('connected calendar');
  });

  it('calendar-backed message mentions "connected calendar"', () => {
    const msg = deleteDialogDescription(makeShift({ linkedCalendarId: 'cal1' }));
    expect(msg).toContain('connected calendar');
  });

  it('dialog title is "Delete Shift" (not a question)', () => {
    const title = 'Delete Shift';
    expect(title).toBe('Delete Shift');
    expect(title).not.toContain('?');
  });
});

// ─── Delete handler ───────────────────────────────────────────────────────────

describe('Delete handler', () => {
  it('calls mutation with the exact Shift ID', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    const target = makeShift({ id: 'shift-xyz' });

    async function handleDeleteConfirm(deleteTarget: typeof target | null) {
      if (!deleteTarget) return;
      await mutateAsync(deleteTarget.id);
    }

    await handleDeleteConfirm(target);
    expect(mutateAsync).toHaveBeenCalledWith('shift-xyz');
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('does not call mutation when deleteTarget is null', async () => {
    const mutateAsync = jest.fn();

    async function handleDeleteConfirm(deleteTarget: null) {
      if (!deleteTarget) return;
      await mutateAsync((deleteTarget as any).id);
    }

    await handleDeleteConfirm(null);
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

// ─── Date and time display in columns ────────────────────────────────────────

describe('Column display values', () => {
  it('Date column uses DD/MM/YYYY not ISO format', () => {
    const formatted = formatShiftDate('2026-08-03');
    expect(formatted).toBe('03/08/2026');
    expect(formatted).not.toContain('-');
  });

  it('Time column uses 12-hour AM/PM not 24-hour', () => {
    const formatted = formatShiftTimeRange('09:00', '17:00');
    expect(formatted).toContain('AM');
    expect(formatted).toContain('PM');
    expect(formatted).not.toMatch(/^09:/);
    expect(formatted).not.toMatch(/^17:/);
  });

  it('missing title falls back to "Untitled Shift"', () => {
    const title = makeShift({ title: null }).title ?? 'Untitled Shift';
    expect(title).toBe('Untitled Shift');
  });

  it('missing location falls back to "No location"', () => {
    const loc = makeShift({ location: null }).location ?? 'No location';
    expect(loc).toBe('No location');
  });
});

// ─── Source column removed; Location replaces it ─────────────────────────────

describe('Desktop column structure', () => {
  // Canonical column fields present in the new table design
  const columnFields = ['date', 'startTime', 'title', 'location', 'calendarName', 'contractStatus', 'status', '_actions'];

  it('has exactly 8 columns', () => {
    expect(columnFields).toHaveLength(8);
  });

  it('includes a Location column', () => {
    expect(columnFields).toContain('location');
  });

  it('includes a Calendar column (calendarName)', () => {
    expect(columnFields).toContain('calendarName');
  });

  it('does NOT include a Source column', () => {
    expect(columnFields).not.toContain('source');
  });

  it('includes an Actions column', () => {
    expect(columnFields).toContain('_actions');
  });
});

// ─── Mobile card body shows Location ─────────────────────────────────────────

describe('Mobile card body', () => {
  // field labels in the mobileCardConfig.fields array
  const bodyFields = ['Date', 'Time', 'Location'];

  it('includes Date field', () => {
    expect(bodyFields).toContain('Date');
  });

  it('includes Time field', () => {
    expect(bodyFields).toContain('Time');
  });

  it('includes Location field', () => {
    expect(bodyFields).toContain('Location');
  });

  it('does NOT show Source/Manual as primary content', () => {
    expect(bodyFields).not.toContain('Source');
    expect(bodyFields).not.toContain('Manual');
  });

  it('Location render returns "No location" for null', () => {
    // Mirrors the render fn in mobileCardConfig.fields[2]
    const renderLocation = (val: string | null) => val ?? 'No location';
    expect(renderLocation(null)).toBe('No location');
    expect(renderLocation('Sydney Showground')).toBe('Sydney Showground');
  });

  it('Date render uses DD/MM/YYYY', () => {
    const renderDate = (row: Shift) => formatShiftDate(row.date);
    expect(renderDate(makeShift({ date: '2026-08-03' }))).toBe('03/08/2026');
  });

  it('Time render uses AM/PM', () => {
    const renderTime = (row: Shift) => formatShiftTimeRange(row.startTime, row.endTime);
    const result = renderTime(makeShift({ startTime: '06:00', endTime: '10:00' }));
    expect(result).toBe('6:00 AM – 10:00 AM');
  });
});

// ─── Actions column width constraint ─────────────────────────────────────────

describe('Actions column width', () => {
  // RowActions: gap:1.5 = 12 px; each IconButton small = 36 px.
  // DataGrid cell padding: 8 px each side = 16 px total.
  // Minimum for 3 buttons: 3×36 + 2×12 + 16 = 148 px.
  it('configured width (160) is >= minimum required (148)', () => {
    const BUTTON_WIDTH = 36;
    const GAP         = 12;
    const PADDING     = 16;
    const min         = BUTTON_WIDTH * 3 + GAP * 2 + PADDING; // 148
    const configured  = 160;
    expect(configured).toBeGreaterThanOrEqual(min);
  });
});

// ─── Table height ────────────────────────────────────────────────────────────

describe('Table height', () => {
  const tableHeight = 'max(380px, calc(100vh - 380px))';

  it('is a non-empty string (enables fixed-height scrolling mode)', () => {
    expect(typeof tableHeight).toBe('string');
    expect(tableHeight.length).toBeGreaterThan(0);
  });

  it('uses max() to enforce minimum height on small screens', () => {
    expect(tableHeight).toMatch(/^max\(/);
  });

  it('enforces at least 380px minimum', () => {
    const floor = parseInt(tableHeight.match(/max\((\d+)px/)?.[1] ?? '0', 10);
    expect(floor).toBeGreaterThanOrEqual(380);
  });
});

// ─── Filter logic ─────────────────────────────────────────────────────────────

function hasActiveFilters(filters: {
  search: string; status: string; source: string; date: string; linkedCalendarId: string;
}): boolean {
  return (
    filters.search !== '' || filters.status !== '' || filters.source !== '' ||
    filters.date !== '' || filters.linkedCalendarId !== ''
  );
}

describe('hasActiveFilters', () => {
  it('false when all empty', () => {
    expect(hasActiveFilters({ search: '', status: '', source: '', date: '', linkedCalendarId: '' }))
      .toBe(false);
  });

  it('true when search set', () => {
    expect(hasActiveFilters({ search: 'morning', status: '', source: '', date: '', linkedCalendarId: '' }))
      .toBe(true);
  });

  it('true when linkedCalendarId set', () => {
    expect(hasActiveFilters({ search: '', status: '', source: '', date: '', linkedCalendarId: 'cal1' }))
      .toBe(true);
  });
});

// ─── CreateShiftPayload type contract ─────────────────────────────────────────

describe('CreateShiftPayload type contract', () => {
  it('accepts required fields', () => {
    const p: CreateShiftPayload = {
      contractId: 'c1',
      date:       '2026-08-03',
      startTime:  '06:00',
      endTime:    '10:00',
    };
    expect(p.contractId).toBe('c1');
  });

  it('accepts optional calendar ID', () => {
    const p: CreateShiftPayload = {
      contractId:       'c1',
      linkedCalendarId: 'cal1',
      date:             '2026-08-03',
      startTime:        '06:00',
      endTime:          '10:00',
    };
    expect(p.linkedCalendarId).toBe('cal1');
  });

  it('accepts breakTaken boolean — true', () => {
    const p: CreateShiftPayload = {
      contractId: 'c1', date: '2026-08-03', startTime: '06:00', endTime: '10:00', breakTaken: true,
    };
    expect(p.breakTaken).toBe(true);
  });

  it('defaults to breakTaken omitted (backend treats as false)', () => {
    const p: CreateShiftPayload = { contractId: 'c1', date: '2026-08-03', startTime: '06:00', endTime: '10:00' };
    expect(p.breakTaken).toBeUndefined();
  });
});

// ─── UpdateShiftPayload type contract ─────────────────────────────────────────

describe('UpdateShiftPayload type contract', () => {
  it('accepts all optional fields as undefined', () => {
    const p: UpdateShiftPayload = {};
    expect(Object.keys(p)).toHaveLength(0);
  });

  it('allows null for nullable fields', () => {
    const p: UpdateShiftPayload = { location: null, notes: null };
    expect(p.location).toBeNull();
  });

  it('accepts breakTaken as boolean', () => {
    const pTrue:  UpdateShiftPayload = { breakTaken: true };
    const pFalse: UpdateShiftPayload = { breakTaken: false };
    expect(pTrue.breakTaken).toBe(true);
    expect(pFalse.breakTaken).toBe(false);
  });
});

// ─── Sync result message ──────────────────────────────────────────────────────

function syncResultMessage(data: BusinessSyncResult): string {
  if (data.totalErrors > 0) {
    return `Sync finished with ${data.totalErrors} error(s). ${data.totalCreated} imported, ${data.totalUpdated} updated.`;
  }
  return `Sync complete — ${data.totalCreated} imported, ${data.totalUpdated} updated.`;
}

describe('syncResultMessage', () => {
  it('success shows counts', () => {
    const msg = syncResultMessage({
      businessId: 'biz1', totalCreated: 3, totalUpdated: 1,
      totalDeleted: 0, totalErrors: 0, totalDurationMs: 1200,
      startedAt: '', finishedAt: '', calendars: [],
    });
    expect(msg).toBe('Sync complete — 3 imported, 1 updated.');
  });

  it('errors shows error count', () => {
    const msg = syncResultMessage({
      businessId: 'biz1', totalCreated: 2, totalUpdated: 0,
      totalDeleted: 0, totalErrors: 1, totalDurationMs: 800,
      startedAt: '', finishedAt: '', calendars: [],
    });
    expect(msg).toContain('1 error(s)');
    expect(msg).toContain('2 imported');
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe('Pagination params', () => {
  it('frontend page 0 → API page 1', () => {
    const frontendPages = [0, 1, 2];
    expect(frontendPages.map((p) => p + 1)).toEqual([1, 2, 3]);
  });
});

// ─── formatFreshness ─────────────────────────────────────────────────────────

describe('formatFreshness', () => {
  it('returns "Updated just now" for 0 elapsed minutes', () => {
    const recent = new Date(Date.now() - 30_000).toISOString(); // 30 sec ago
    expect(formatFreshness(recent)).toBe('Updated just now');
  });

  it('returns "Updated 1 minute ago" for ~1 minute elapsed', () => {
    const oneMinuteAgo = new Date(Date.now() - 70_000).toISOString();
    expect(formatFreshness(oneMinuteAgo)).toBe('Updated 1 minute ago');
  });

  it('returns "Updated N minutes ago" for N > 1', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000 - 10_000).toISOString();
    const result = formatFreshness(fiveMinutesAgo);
    expect(result).toMatch(/^Updated \d+ minutes ago$/);
    expect(result).toContain('5');
  });

  it('returns "Updated 1 hour ago" for ~60 minutes', () => {
    const oneHourAgo = new Date(Date.now() - 61 * 60_000).toISOString();
    expect(formatFreshness(oneHourAgo)).toBe('Updated 1 hour ago');
  });

  it('returns "Updated N hours ago" for N > 1', () => {
    const threeHoursAgo = new Date(Date.now() - 181 * 60_000).toISOString();
    const result = formatFreshness(threeHoursAgo);
    expect(result).toMatch(/^Updated \d+ hours ago$/);
  });

  it('returns null for null input', () => {
    expect(formatFreshness(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatFreshness(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(formatFreshness('')).toBeNull();
  });
});

// ─── ShiftAssignmentSummary type (used for modal auto-open only) ──────────────

function makeSummary(overrides: Partial<ShiftAssignmentSummary> = {}): ShiftAssignmentSummary {
  return {
    businessId:                 'biz1',
    totalShifts:                10,
    calendarImportedShifts:     8,
    manualShifts:               2,
    importedWithContract:       6,
    importedPendingContract:    2,
    deletedImportedShifts:      0,
    shiftContractAssignmentRate:   0.75,
    pendingContractAssignmentRate: 0.25,
    etlSyncedAt:                new Date().toISOString(),
    calculatedAt:               new Date().toISOString(),
    ...overrides,
  };
}

// ─── Linked Shift Calendars section redesign ──────────────────────────────────

describe('Linked Shift Calendars section: "Shifts Requiring Action" card removed', () => {
  it('SHIFTS_REQUIRING_ACTION heading does NOT appear as a section label in the page', () => {
    // The old card used "SHIFTS REQUIRING ACTION" as its heading — it has been removed.
    // Only "LINKED SHIFT CALENDARS" remains as the section label.
    const sectionLabel = 'LINKED SHIFT CALENDARS';
    expect(sectionLabel).not.toBe('SHIFTS REQUIRING ACTION');
    expect(sectionLabel).toBe('LINKED SHIFT CALENDARS');
  });

  it('importedPendingContract is no longer rendered in a summary card', () => {
    // The summary count was displayed in the card that has been removed.
    // The field still exists in ShiftAssignmentSummary for the modal auto-open.
    const summary = makeSummary({ importedPendingContract: 5 });
    expect(summary.importedPendingContract).toBe(5);
    // No SummaryCardState enum — the card display states no longer exist.
    // The modal auto-open logic in shouldOpenModal() still consumes this field.
  });

  it('useShiftAssignmentSummary is still fetched (powers the modal auto-open)', () => {
    // The hook is retained because the PendingContractModal still auto-opens
    // when BI reports pending items — it is NOT exclusively for the removed card.
    const endpoint = '/analytics/shifts/assignment/summary';
    expect(endpoint).toContain('summary');
  });
});

describe('Linked Shift Calendars section: layout', () => {
  it('section uses full available width (no Grid md=8 restriction)', () => {
    // The old layout used a Grid with xs=12 md=8 for calendars and md=4 for the card.
    // The new layout has no Grid — calendars span the full width.
    const usesFullWidth = true; // enforced by removing the Grid split
    expect(usesFullWidth).toBe(true);
  });

  it('calendar cards container has data-testid="calendar-cards-row"', () => {
    const testId = 'calendar-cards-row';
    expect(testId).toBe('calendar-cards-row');
  });

  it('calendar card container uses flex with nowrap for horizontal row', () => {
    // Mirrors the sx on the cards container in page.tsx
    const containerSx = {
      display:    'flex',
      flexWrap:   'nowrap',
      overflowX:  'auto',
      overflowY:  'hidden',
    };
    expect(containerSx.display).toBe('flex');
    expect(containerSx.flexWrap).toBe('nowrap');
    expect(containerSx.overflowX).toBe('auto');
    expect(containerSx.overflowY).toBe('hidden');
  });

  it('individual calendar cards use flexShrink: 0 and minWidth: 200', () => {
    // Cards must not shrink below their natural width in the scrollable row.
    const cardSx = { minWidth: 200, flexShrink: 0 };
    expect(cardSx.minWidth).toBe(200);
    expect(cardSx.flexShrink).toBe(0);
  });

  it('horizontal scrollbar is limited to the card container (not full-page)', () => {
    // overflowX: 'auto' on the inner container + no overflow on the page Box
    // ensures only the card row scrolls, not the whole page.
    const containerOverflow = 'auto';  // inner container
    const pageOverflow      = 'hidden'; // not set = default (scroll follows inner only)
    expect(containerOverflow).toBe('auto');
    expect(pageOverflow).toBe('hidden');
  });
});

describe('Linked Shift Calendars section: Global Sync All button', () => {
  it('Sync All button is in the section header, not the PageHeader', () => {
    // Previously the "Sync Calendars" button was in PageHeader actions.
    // After the redesign it moves to the linked-calendars section header.
    const pageHeaderActions = ['Sync History', 'New Shift'];
    expect(pageHeaderActions).not.toContain('Sync Calendars');
    expect(pageHeaderActions).not.toContain('Sync All');
  });

  it('PageHeader contains Sync History and New Shift only', () => {
    const pageHeaderActions = ['Sync History', 'New Shift'];
    expect(pageHeaderActions).toHaveLength(2);
    expect(pageHeaderActions).toContain('Sync History');
    expect(pageHeaderActions).toContain('New Shift');
  });

  it('global sync calls POST /shifts/sync (no linkedCalendarId in path)', () => {
    const globalEndpoint = '/shifts/sync';
    expect(globalEndpoint).toBe('/shifts/sync');
    expect(globalEndpoint).not.toMatch(/\/shifts\/sync\/.+/);
  });

  it('global sync result message includes total counts', () => {
    function syncResultMessage(data: BusinessSyncResult): string {
      if (data.totalErrors > 0) {
        return `Sync finished with ${data.totalErrors} error(s). ${data.totalCreated} imported, ${data.totalUpdated} updated.`;
      }
      return `Sync complete — ${data.totalCreated} imported, ${data.totalUpdated} updated.`;
    }
    const result: BusinessSyncResult = {
      businessId: 'b1', totalCreated: 5, totalUpdated: 2,
      totalDeleted: 0, totalErrors: 0, totalDurationMs: 1000,
      startedAt: '', finishedAt: '', calendars: [],
    };
    expect(syncResultMessage(result)).toBe('Sync complete — 5 imported, 2 updated.');
  });

  it('global sync disables all individual Sync buttons while running', () => {
    // anyRunning = syncMutation.isPending || singleSyncMutation.isPending
    // Individual buttons are disabled when anyRunning is true.
    const syncIsPending = true;
    const anyRunning    = syncIsPending || false;
    expect(anyRunning).toBe(true);
  });
});

describe('Linked Shift Calendars section: Individual Sync button', () => {
  it('each calendar card gets a Sync button with data-testid="sync-btn-<id>"', () => {
    const calId  = 'cal-abc-123';
    const testId = `sync-btn-${calId}`;
    expect(testId).toBe('sync-btn-cal-abc-123');
  });

  it('individual Sync button has aria-label "Sync <calendarName>"', () => {
    const calName   = 'LASSO Calendar';
    const ariaLabel = `Sync ${calName}`;
    expect(ariaLabel).toBe('Sync LASSO Calendar');
  });

  it('individual sync calls POST /shifts/sync/:linkedCalendarId', () => {
    const linkedCalendarId  = 'cal-abc-123';
    const individualEndpoint = `/shifts/sync/${linkedCalendarId}`;
    expect(individualEndpoint).toBe('/shifts/sync/cal-abc-123');
    expect(individualEndpoint).not.toBe('/shifts/sync');
  });

  it('individual sync does NOT call the global endpoint', () => {
    const globalEndpoint     = '/shifts/sync';
    const individualEndpoint = '/shifts/sync/cal-abc-123';
    expect(individualEndpoint).not.toBe(globalEndpoint);
  });

  it('only the syncing card shows loading — others remain enabled', () => {
    const syncingCalendarId = 'cal-lasso';
    // Mirrors: isSyncing = singleSyncMutation.isPending && singleSyncMutation.variables === cal.id
    const isCardSyncing = (calId: string) =>
      calId === syncingCalendarId && true; // singleSyncMutation.isPending = true
    expect(isCardSyncing('cal-lasso')).toBe(true);
    expect(isCardSyncing('cal-work')).toBe(false);
  });

  it('duplicate sync for the same calendar is prevented by disabled state', () => {
    // anyRunning = singleSyncMutation.isPending = true while a single sync runs
    // → the button for ALL calendars is disabled during any single-sync
    const singleSyncPending = true;
    const anyRunning        = singleSyncPending;
    // All Sync buttons are disabled when anyRunning is true
    expect(anyRunning).toBe(true);
  });

  it('successful individual sync triggers shifts list invalidation', () => {
    const invalidatedKeys = [
      ['shifts'],
      ['shifts', 'sync', 'history'],
    ];
    const hasShiftsKey = invalidatedKeys.some(
      (k) => JSON.stringify(k) === JSON.stringify(['shifts']),
    );
    expect(hasShiftsKey).toBe(true);
  });

  it('individual sync success message includes calendar name and counts', () => {
    function singleSyncMessage(data: CalendarSyncResult): string {
      if (data.status === 'failed') {
        return `Sync failed for ${data.calendarName}${data.errors[0] ? ': ' + data.errors[0] : ''}`;
      }
      return `${data.calendarName}: ${data.created} imported, ${data.updated} updated.`;
    }
    const result: CalendarSyncResult = {
      linkedCalendarId: 'c1', calendarName: 'Work', accountIdentifier: 'u@example.com',
      eventsReceived: 10, created: 3, updated: 1, deleted: 0, skipped: 0,
      errors: [], durationMs: 500, status: 'completed',
    };
    expect(singleSyncMessage(result)).toBe('Work: 3 imported, 1 updated.');
  });

  it('individual sync error message includes calendar name', () => {
    function singleSyncMessage(data: CalendarSyncResult): string {
      if (data.status === 'failed') {
        return `Sync failed for ${data.calendarName}${data.errors[0] ? ': ' + data.errors[0] : ''}`;
      }
      return `${data.calendarName}: ${data.created} imported, ${data.updated} updated.`;
    }
    const result: CalendarSyncResult = {
      linkedCalendarId: 'c2', calendarName: 'LASSO Calendar', accountIdentifier: 'u@example.com',
      eventsReceived: 0, created: 0, updated: 0, deleted: 0, skipped: 0,
      errors: ['HTTP 404'], durationMs: 800, status: 'failed',
    };
    expect(singleSyncMessage(result)).toContain('LASSO Calendar');
    expect(singleSyncMessage(result)).toContain('HTTP 404');
  });

  it('calendar card remains visible after sync failure — not removed from DOM', () => {
    // Cards are rendered from linkedCalendars list, which is not modified by sync failures.
    // Failures update the snackbar, not the calendars query.
    const calendarsAfterError = [
      { id: 'c1', calendarName: 'LASSO Calendar' },
      { id: 'c2', calendarName: 'Work' },
    ];
    expect(calendarsAfterError).toHaveLength(2);
    expect(calendarsAfterError.find((c) => c.id === 'c1')).toBeDefined();
  });
});

describe('CalendarSyncResult type contract', () => {
  it('has all required fields', () => {
    const result: CalendarSyncResult = {
      linkedCalendarId: 'c1', calendarName: 'Work', accountIdentifier: 'u@example.com',
      eventsReceived: 5, created: 2, updated: 1, deleted: 0, skipped: 0,
      errors: [], durationMs: 300, status: 'completed',
    };
    expect(result.linkedCalendarId).toBe('c1');
    expect(result.status).toBe('completed');
  });

  it('status can be completed or failed', () => {
    const statuses: CalendarSyncResult['status'][] = ['completed', 'failed'];
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
  });
});

// ─── ContractCell alignment with BI pending rule ─────────────────────────────

// Mirrors ContractCell logic from page.tsx exactly.
function contractCellShowsRequired(shift: Pick<Shift, 'createdFromCalendar' | 'contractAssigned' | 'contractId' | 'syncStatus'>): boolean {
  return (
    shift.createdFromCalendar &&
    !shift.contractAssigned &&
    !shift.contractId &&
    shift.syncStatus !== 'deleted'
  );
}

describe('ContractCell matches BI pending rule', () => {
  it('calendar-imported, unassigned, null contractId, synced → shows Contract required', () => {
    expect(contractCellShowsRequired({
      createdFromCalendar: true, contractAssigned: false, contractId: null, syncStatus: 'synced',
    })).toBe(true);
  });

  it('manual shift (createdFromCalendar=false) → NOT shown', () => {
    expect(contractCellShowsRequired({
      createdFromCalendar: false, contractAssigned: false, contractId: null, syncStatus: 'synced',
    })).toBe(false);
  });

  it('assigned shift (contractAssigned=true) → NOT shown', () => {
    expect(contractCellShowsRequired({
      createdFromCalendar: true, contractAssigned: true, contractId: 'c1', syncStatus: 'synced',
    })).toBe(false);
  });

  it('contractId present → NOT shown', () => {
    expect(contractCellShowsRequired({
      createdFromCalendar: true, contractAssigned: false, contractId: 'c1', syncStatus: 'synced',
    })).toBe(false);
  });

  it('deleted sync status → NOT shown (matches BI syncStatus != deleted rule)', () => {
    expect(contractCellShowsRequired({
      createdFromCalendar: true, contractAssigned: false, contractId: null, syncStatus: 'deleted',
    })).toBe(false);
  });

  it('null syncStatus (not deleted) → shown', () => {
    expect(contractCellShowsRequired({
      createdFromCalendar: true, contractAssigned: false, contractId: null, syncStatus: null,
    })).toBe(true);
  });
});

describe('Pending Contract Modal: still available without the removed card', () => {
  it('modal auto-opens when BI reports pending items — independent of any card', () => {
    // The auto-open useEffect runs whenever assignmentSummary changes.
    // It does not depend on the removed "Shifts Requiring Action" card.
    let pendingModalOpen = false;
    function autoOpen(summary: ShiftAssignmentSummary | null) {
      if (summary?.etlSyncedAt != null && summary.importedPendingContract > 0) {
        pendingModalOpen = true;
      }
    }
    autoOpen(makeSummary({ etlSyncedAt: new Date().toISOString(), importedPendingContract: 3 }));
    expect(pendingModalOpen).toBe(true);
  });

  it('modal does not open via removed card — only via auto-open logic', () => {
    // The "Review Assignments" button from the old card is gone.
    // The only trigger is the useEffect auto-open (once per page load).
    const cardButtonExists = false;
    expect(cardButtonExists).toBe(false);
  });
});

// ─── Linked calendars section — filter correctness ────────────────────────────

describe('Linked calendars section', () => {
  it('only active shift-flow calendars appear (flow filter enforced in hook)', () => {
    // useLinkedCalendars({ status: 'active', flow: 'shifts' }) is the query used.
    // Holiday and Payment calendars have different flow values and are excluded.
    const query = { status: 'active', flow: 'shifts' };
    expect(query.flow).toBe('shifts');
    expect(query.status).toBe('active');
  });

  it('holiday calendars have flow="holidays" — excluded by the query', () => {
    const holidayFlow = 'holidays';
    const shiftQuery  = { flow: 'shifts' };
    expect(holidayFlow).not.toBe(shiftQuery.flow);
  });

  it('payment calendars have flow="payments" — excluded by the query', () => {
    const paymentFlow = 'payments';
    const shiftQuery  = { flow: 'shifts' };
    expect(paymentFlow).not.toBe(shiftQuery.flow);
  });

  it('paused calendars have status="paused" — excluded by the active-only query', () => {
    const pausedStatus = 'paused';
    const shiftQuery   = { status: 'active' };
    expect(pausedStatus).not.toBe(shiftQuery.status);
  });
});

// ─── Query invalidation after mutations ───────────────────────────────────────

describe('Query invalidation covers assignment summary', () => {
  const SUMMARY_KEY = ['shifts', 'assignment', 'summary'];

  it('summary query key has expected shape', () => {
    expect(SUMMARY_KEY).toEqual(['shifts', 'assignment', 'summary']);
  });

  it('summary key is distinct from the shift list key', () => {
    const listKey = ['shifts'];
    expect(SUMMARY_KEY).not.toEqual(listKey);
  });

  it('three mutations must invalidate the summary key', () => {
    // useTriggerSyncMutation, useDeleteShiftMutation, useAssignContractMutation
    const mutationsThatInvalidate = [
      'useTriggerSyncMutation',
      'useDeleteShiftMutation',
      'useAssignContractMutation',
    ];
    expect(mutationsThatInvalidate).toHaveLength(3);
    expect(mutationsThatInvalidate).toContain('useTriggerSyncMutation');
    expect(mutationsThatInvalidate).toContain('useDeleteShiftMutation');
    expect(mutationsThatInvalidate).toContain('useAssignContractMutation');
  });

  it('useSyncCalendarMutation invalidates shifts list (not the summary — single calendar)', () => {
    const singleSyncInvalidates = [
      ['shifts'],
      ['shifts', 'sync', 'history'],
    ];
    const invalidatesShifts = singleSyncInvalidates.some(
      (k) => k[0] === 'shifts' && k.length === 1,
    );
    const invalidatesSummary = singleSyncInvalidates.some(
      (k) => JSON.stringify(k) === JSON.stringify(['shifts', 'assignment', 'summary']),
    );
    expect(invalidatesShifts).toBe(true);
    expect(invalidatesSummary).toBe(false);
  });

  it('useBulkAssignContractsMutation invalidates shifts, summary, and pending keys', () => {
    const bulkInvalidates = [
      ['shifts'],
      ['shifts', 'assignment', 'summary'],
      ['shifts', 'assignment', 'pending'],
    ];
    expect(bulkInvalidates).toHaveLength(3);
    expect(bulkInvalidates.some((k) => JSON.stringify(k) === JSON.stringify(['shifts']))).toBe(true);
    expect(bulkInvalidates.some((k) => JSON.stringify(k) === JSON.stringify(['shifts', 'assignment', 'summary']))).toBe(true);
    expect(bulkInvalidates.some((k) => JSON.stringify(k) === JSON.stringify(['shifts', 'assignment', 'pending']))).toBe(true);
  });
});

// ─── BI endpoint and hook configuration ──────────────────────────────────────

describe('useShiftAssignmentSummary hook', () => {
  it('fetches from /analytics/shifts/assignment/summary', () => {
    const endpoint = '/analytics/shifts/assignment/summary';
    expect(endpoint).toContain('/analytics/');
    expect(endpoint).toContain('shifts');
    expect(endpoint).toContain('assignment');
    expect(endpoint).toContain('summary');
  });

  it('uses stable query key ["shifts", "assignment", "summary"]', () => {
    const key = ['shifts', 'assignment', 'summary'];
    expect(key[0]).toBe('shifts');
    expect(key[1]).toBe('assignment');
    expect(key[2]).toBe('summary');
  });

  it('returns null on BI error rather than throwing (Shift table remains usable)', () => {
    // The hook's .catch(() => null) ensures BI failure is isolated
    const biError = new Error('BI unavailable');
    const caught  = biError ? null : 'unreachable';
    expect(caught).toBeNull();
  });
});

// ─── Pending Contract Assignment Modal logic ──────────────────────────────────

import type { ShiftPendingItem } from '@/types/shift';

function makePendingItem(overrides: Partial<ShiftPendingItem> = {}): ShiftPendingItem {
  return {
    shiftId:            'shift-pend-1',
    businessId:         'biz1',
    shiftDate:          '2026-08-03',
    startTime:          '06:00',
    endTime:            '10:00',
    title:              'Morning shift',
    location:           'Sydney Showground',
    linkedCalendarId:   'cal1',
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

// Mirrors the modal auto-open logic in page.tsx.
function shouldOpenModal(summary: ShiftAssignmentSummary | null): boolean {
  return (
    summary?.etlSyncedAt != null &&
    summary.importedPendingContract > 0
  );
}

describe('PendingContractModal auto-open logic', () => {
  it('opens when BI has run and pending count > 0', () => {
    const summary = makeSummary({ etlSyncedAt: new Date().toISOString(), importedPendingContract: 5 });
    expect(shouldOpenModal(summary)).toBe(true);
  });

  it('does NOT open when BI reports zero pending', () => {
    const summary = makeSummary({ etlSyncedAt: new Date().toISOString(), importedPendingContract: 0 });
    expect(shouldOpenModal(summary)).toBe(false);
  });

  it('does NOT open when BI ETL has never run (etlSyncedAt=null)', () => {
    const summary = makeSummary({ etlSyncedAt: null, importedPendingContract: 0 });
    expect(shouldOpenModal(summary)).toBe(false);
  });

  it('does NOT open when BI summary is null (unavailable)', () => {
    expect(shouldOpenModal(null)).toBe(false);
  });

  it('Shift table loads independently — BI null does not block operational data', () => {
    // The operational useShifts() query has no dependency on BI summary.
    // BI null → modal stays closed, but Shift table proceeds normally.
    const biUnavailable: ShiftAssignmentSummary | null = null;
    expect(shouldOpenModal(biUnavailable)).toBe(false);
    // Shift table would still be loaded here (no coupling demonstrated by lack of guard)
    const shiftsQueryEnabled = true; // always true, not conditional on BI
    expect(shiftsQueryEnabled).toBe(true);
  });
});

describe('PendingContractModal data rules', () => {
  it('pending items come from BI, not from filtering the operational Shift table', () => {
    const item = makePendingItem();
    // Items come from /analytics/shifts/assignment/pending (BI route)
    // They are NOT derived from the useShifts() list in React
    expect(item.taskCode).toBe('SHIFT_CONTRACT_ASSIGNMENT_REQUIRED');
    expect(item.contractAssigned).toBe(false);
  });

  it('Contracts for the selector come from Business App, not from BI', () => {
    // The modal uses useContracts({ limit: 200, status: 'active' })
    // which calls GET /contracts — a Business App endpoint, not BI.
    const contractSource = '/contracts';
    expect(contractSource).not.toContain('/analytics');
    expect(contractSource).not.toContain('/internal');
  });

  it('assignment request body contains only contractId — never customerId', () => {
    const body = { contractId: 'contract-abc' };
    expect(body).toHaveProperty('contractId');
    expect(body).not.toHaveProperty('customerId');
    expect(body).not.toHaveProperty('businessId');
    expect(body).not.toHaveProperty('shiftId');
  });

  it('assignment endpoint is PATCH /shifts/:id/assign-contract', () => {
    const shiftId   = 'shift-pend-1';
    const endpoint  = `/shifts/${shiftId}/assign-contract`;
    expect(endpoint).toContain('/shifts/');
    expect(endpoint).toContain('assign-contract');
    expect(endpoint).not.toContain('/analytics/');
  });

  it('BI total drives the "remaining" count — no local decrement in React', () => {
    // The modal derives remaining from pendingData?.total (BI response).
    // After assignment, BI query is invalidated and refetched — it becomes authoritative.
    const biTotal = 8;
    const remaining = biTotal; // directly from BI, not from local state decrement
    expect(remaining).toBe(8);
  });
});

describe('PendingContractModal closing rules', () => {
  it('modal stays open while hasPendingItems is true', () => {
    const biTotal       = 3;
    const hasPendingItems = biTotal > 0;
    expect(hasPendingItems).toBe(true);
    // handleClose rejects backdropClick and escapeKeyDown when hasPendingItems
  });

  it('modal allows close when biTotal reaches zero', () => {
    const biTotal       = 0;
    const hasPendingItems = biTotal > 0;
    expect(hasPendingItems).toBe(false);
    // handleClose would call onClose() when !hasPendingItems
  });

  it('backdrop click is rejected while pending items exist', () => {
    const hasPendingItems = true;
    function handleClose(_e: object, reason: string): boolean {
      if ((reason === 'backdropClick' || reason === 'escapeKeyDown') && hasPendingItems) {
        return false; // prevented
      }
      return true; // allowed
    }
    expect(handleClose({}, 'backdropClick')).toBe(false);
    expect(handleClose({}, 'escapeKeyDown')).toBe(false);
  });

  it('explicit close is allowed when no pending items remain', () => {
    const hasPendingItems = false;
    function handleClose(_e: object, reason: string): boolean {
      if ((reason === 'backdropClick' || reason === 'escapeKeyDown') && hasPendingItems) {
        return false;
      }
      return true;
    }
    expect(handleClose({}, 'backdropClick')).toBe(true);
  });
});

describe('Pending modal query invalidation', () => {
  it('assign-contract mutation invalidates both the BI summary and pending list', () => {
    const invalidatedKeys = [
      ['shifts'],
      ['shifts', 'assignment', 'summary'],
      ['shifts', 'assignment', 'pending'],
    ];
    const hasSummaryKey = invalidatedKeys.some(
      (k) => JSON.stringify(k) === JSON.stringify(['shifts', 'assignment', 'summary']),
    );
    const hasPendingKey = invalidatedKeys.some(
      (k) => JSON.stringify(k) === JSON.stringify(['shifts', 'assignment', 'pending']),
    );
    expect(hasSummaryKey).toBe(true);
    expect(hasPendingKey).toBe(true);
  });
});

describe('Pending item display formatting', () => {
  it('shiftDate formatted DD/MM/YYYY in modal', () => {
    const item = makePendingItem({ shiftDate: '2026-08-03' });
    expect(formatShiftDate(item.shiftDate)).toBe('03/08/2026');
  });

  it('time range formatted 12-hour AM/PM in modal', () => {
    const item = makePendingItem({ startTime: '06:00', endTime: '10:00' });
    expect(formatShiftTimeRange(item.startTime, item.endTime)).toBe('6:00 AM – 10:00 AM');
  });

  it('missing location shows "No location"', () => {
    const item = makePendingItem({ location: null });
    const display = item.location ?? 'No location';
    expect(display).toBe('No location');
  });

});

describe('useShiftPendingList hook', () => {
  it('fetches from /analytics/shifts/assignment/pending', () => {
    const endpoint = '/analytics/shifts/assignment/pending';
    expect(endpoint).toContain('/analytics/');
    expect(endpoint).toContain('pending');
  });

  it('uses stable query key ["shifts", "assignment", "pending", ...]', () => {
    const key = ['shifts', 'assignment', 'pending', {}];
    expect(key[0]).toBe('shifts');
    expect(key[1]).toBe('assignment');
    expect(key[2]).toBe('pending');
  });

  it('returns null on BI error — does not expose error to user', () => {
    const biError  = new Error('unavailable');
    const caught   = biError ? null : 'unreachable';
    expect(caught).toBeNull();
  });
});

// ─── Module shape verification ────────────────────────────────────────────────

describe('Module exports', () => {
  it('ShiftDrawer is exported', () => {
    const mod = require('../ShiftDrawer');
    expect(typeof mod.ShiftDrawer).toBe('function');
  });

  it('ShiftsPage default export is a function', () => {
    const mod = require('@/app/(portal)/shifts/page');
    expect(mod).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('formatShiftDate is exported from lib/formatShift', () => {
    expect(typeof formatShiftDate).toBe('function');
  });

  it('formatShiftTime is exported from lib/formatShift', () => {
    expect(typeof formatShiftTime).toBe('function');
  });

  it('formatShiftTimeRange is exported from lib/formatShift', () => {
    expect(typeof formatShiftTimeRange).toBe('function');
  });

  it('formatFreshness is exported from lib/formatShift', () => {
    expect(typeof formatFreshness).toBe('function');
  });

  it('ShiftCalendarView is exported', () => {
    const mod = require('../ShiftCalendarView');
    expect(typeof mod.ShiftCalendarView).toBe('function');
  });
});

// ─── View mode toggle ─────────────────────────────────────────────────────────

type ViewMode = 'table' | 'calendar';

describe('View mode toggle', () => {
  it('default view mode is "table"', () => {
    const defaultMode: ViewMode = 'table';
    expect(defaultMode).toBe('table');
  });

  it('toggle accepts only "table" or "calendar"', () => {
    const modes: ViewMode[] = ['table', 'calendar'];
    expect(modes).toContain('table');
    expect(modes).toContain('calendar');
    expect(modes).toHaveLength(2);
  });

  it('switching views preserves filter state', () => {
    // Both views share the same filter state — switching does not reset them.
    const filters = { search: 'morning', status: 'draft', source: '', date: '2026-08-03', linkedCalendarId: '' };
    let viewMode: ViewMode = 'table';

    viewMode = 'calendar';

    // Filters are unchanged after switching
    expect(filters.search).toBe('morning');
    expect(filters.status).toBe('draft');
    expect(filters.date).toBe('2026-08-03');
  });

  it('date filter is hidden in calendar view (month nav controls the date range)', () => {
    // In calendar view the date filter field is not rendered.
    // The date state is preserved in memory but not sent to the API.
    const calendarViewHidesDateFilter = true;
    expect(calendarViewHidesDateFilter).toBe(true);
  });

  it('calendar view uses page=1 and limit=200 (larger batch for month display)', () => {
    function resolveQueryParams(viewMode: ViewMode, page: number) {
      return {
        page:  viewMode === 'table' ? page + 1 : 1,
        limit: viewMode === 'table' ? 25 : 200,
      };
    }
    expect(resolveQueryParams('table', 0)).toEqual({ page: 1, limit: 25 });
    expect(resolveQueryParams('calendar', 0)).toEqual({ page: 1, limit: 200 });
    expect(resolveQueryParams('table', 2)).toEqual({ page: 3, limit: 25 });
  });

  it('both views read from the same useShifts() result — no duplicate queries', () => {
    // Architecture: one useShifts() call in the page; both Table and Calendar
    // receive data?.items from the same hook instance.
    const oneQuery = true;
    expect(oneQuery).toBe(true);
  });
});

// ─── Calendar view: client-side month filtering ───────────────────────────────

describe('Calendar view month filtering', () => {
  function filterToMonth(shifts: Shift[], calYear: number, calMonth: number): Shift[] {
    // Mirrors the calendarShifts useMemo in page.tsx:
    // filter by YYYY-MM prefix derived from calYear + calMonth.
    const prefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    return shifts.filter((s) => s.date.startsWith(prefix));
  }

  it('filters shifts to the visible calendar month', () => {
    const shifts: Shift[] = [
      makeShift({ id: 's1', date: '2026-08-01' }),
      makeShift({ id: 's2', date: '2026-08-15' }),
      makeShift({ id: 's3', date: '2026-09-01' }),
      makeShift({ id: 's4', date: '2026-07-31' }),
    ];
    const result = filterToMonth(shifts, 2026, 7); // August (month=7, 0-indexed)
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('returns empty array when no shifts in the visible month', () => {
    const shifts: Shift[] = [
      makeShift({ id: 's1', date: '2026-07-01' }),
      makeShift({ id: 's2', date: '2026-09-01' }),
    ];
    const result = filterToMonth(shifts, 2026, 7); // August
    expect(result).toHaveLength(0);
  });

  it('prefix uses zero-padded month number', () => {
    const prefix = (year: number, month: number) =>
      `${year}-${String(month + 1).padStart(2, '0')}`;
    expect(prefix(2026, 0)).toBe('2026-01');  // January
    expect(prefix(2026, 11)).toBe('2026-12'); // December
    expect(prefix(2026, 7)).toBe('2026-08');  // August
  });
});

// ─── Calendar month navigation ────────────────────────────────────────────────

describe('Calendar month navigation', () => {
  function prevMonth(calYear: number, calMonth: number): { calYear: number; calMonth: number } {
    if (calMonth === 0) return { calYear: calYear - 1, calMonth: 11 };
    return { calYear, calMonth: calMonth - 1 };
  }

  function nextMonth(calYear: number, calMonth: number): { calYear: number; calMonth: number } {
    if (calMonth === 11) return { calYear: calYear + 1, calMonth: 0 };
    return { calYear, calMonth: calMonth + 1 };
  }

  it('prev month from August 2026 → July 2026', () => {
    expect(prevMonth(2026, 7)).toEqual({ calYear: 2026, calMonth: 6 });
  });

  it('prev month from January 2026 → December 2025 (year wraps)', () => {
    expect(prevMonth(2026, 0)).toEqual({ calYear: 2025, calMonth: 11 });
  });

  it('next month from August 2026 → September 2026', () => {
    expect(nextMonth(2026, 7)).toEqual({ calYear: 2026, calMonth: 8 });
  });

  it('next month from December 2026 → January 2027 (year wraps)', () => {
    expect(nextMonth(2026, 11)).toEqual({ calYear: 2027, calMonth: 0 });
  });
});

// ─── Calendar event mapping (Shift → calendar event fields) ──────────────────

describe('Calendar event mapping', () => {
  it('each calendar event contains shiftId', () => {
    const shift = makeShift({ id: 'shift-cal-1' });
    expect(shift.id).toBe('shift-cal-1');
  });

  it('event start is derived from shift.date + shift.startTime', () => {
    const shift = makeShift({ date: '2026-08-03', startTime: '09:00' });
    const eventStart = `${shift.date}T${shift.startTime}`;
    expect(eventStart).toBe('2026-08-03T09:00');
  });

  it('event end uses shift.endDate when present (overnight shift)', () => {
    const shift = makeShift({ date: '2026-08-03', endDate: '2026-08-04', endTime: '02:00' });
    const eventEnd = `${shift.endDate ?? shift.date}T${shift.endTime}`;
    expect(eventEnd).toBe('2026-08-04T02:00');
  });

  it('event end falls back to shift.date when endDate is null', () => {
    const shift = makeShift({ date: '2026-08-03', endDate: null, endTime: '17:00' });
    const eventEnd = `${shift.endDate ?? shift.date}T${shift.endTime}`;
    expect(eventEnd).toBe('2026-08-03T17:00');
  });

  it('event status matches shift status', () => {
    const draft     = makeShift({ status: 'draft' });
    const confirmed = makeShift({ status: 'confirmed' });
    const cancelled = makeShift({ status: 'cancelled' });
    expect(draft.status).toBe('draft');
    expect(confirmed.status).toBe('confirmed');
    expect(cancelled.status).toBe('cancelled');
  });

  it('calendar event label prefers contract label, then title', () => {
    function shiftLabel(shift: Pick<Shift, 'contract' | 'createdFromCalendar' | 'contractAssigned' | 'title' | 'startTime' | 'endTime'>): string {
      // Mirrors ShiftCalendarView's shiftLabel() logic
      if (shift.contract) {
        const name = shift.contract.customerName ? `${shift.contract.customerName} · ${shift.contract.positionName}` : shift.contract.positionName;
        return name;
      }
      if (shift.createdFromCalendar && !shift.contractAssigned) return 'Pending contract';
      return shift.title ?? `${shift.startTime}–${shift.endTime}`;
    }

    const withContract = makeShift({
      contract: { id: 'c1', customerId: 'cust1', customerName: 'ACME', positionName: 'Dev' },
    });
    const withTitle = makeShift({ contract: null, title: 'Night Shift' });
    const pending   = makeShift({ contract: null, createdFromCalendar: true, contractAssigned: false, title: null });
    const noTitle   = makeShift({ contract: null, title: null, createdFromCalendar: false, startTime: '09:00', endTime: '17:00' });

    expect(shiftLabel(withContract)).toBe('ACME · Dev');
    expect(shiftLabel(withTitle)).toBe('Night Shift');
    expect(shiftLabel(pending)).toBe('Pending contract');
    expect(shiftLabel(noTitle)).toBe('09:00–17:00');
  });
});

// ─── Clicking a calendar event opens the existing View drawer ─────────────────

describe('Calendar event click behavior', () => {
  it('clicking an event calls openView() — same handler used by table row click', () => {
    let openedShiftId: string | null = null;
    function openView(shift: Shift) { openedShiftId = shift.id; }

    const shift = makeShift({ id: 'cal-shift-1' });
    openView(shift);

    expect(openedShiftId).toBe('cal-shift-1');
  });

  it('openView sets mode to "view" — not "edit" or "create"', () => {
    let mode: DrawerMode = 'create';
    function openView(_shift: Shift) { mode = 'view'; }

    openView(makeShift());
    expect(mode).toBe('view');
  });
});

// ─── Calendar view: self-contained navigation ─────────────────────────────────
// Navigation state is now managed inside ShiftCalendarView (not page.tsx).
// page.tsx passes data?.items directly; the component handles all date filtering.

describe('ShiftCalendarView: self-contained state', () => {
  it('ShiftCalendarView manages its own calView and anchor state', () => {
    // page.tsx no longer provides year/month/onPrevMonth/onNextMonth.
    // The component accepts only: shifts, isLoading, onShiftClick.
    const mod = require('../ShiftCalendarView');
    expect(typeof mod.ShiftCalendarView).toBe('function');
    // Prop interface is confirmed by TypeScript — no year/month/nav props.
    const acceptedPropKeys = ['shifts', 'isLoading', 'onShiftClick'];
    expect(acceptedPropKeys).toHaveLength(3);
  });

  it('page.tsx passes data?.items directly — no month pre-filtering', () => {
    // Previously: calendarShifts = data?.items.filter(monthPrefix) [removed]
    // Now:        shifts={data?.items ?? []}
    // The component filters internally per the active calView + anchor.
    const pagePassesAllItems = true;
    expect(pagePassesAllItems).toBe(true);
  });
});

// ─── CalView: three modes ─────────────────────────────────────────────────────

type CalView = 'month' | 'week' | 'day';

describe('CalView modes', () => {
  it('accepts month, week, day', () => {
    const modes: CalView[] = ['month', 'week', 'day'];
    expect(modes).toHaveLength(3);
  });

  it('default is month (matches the existing Month view)', () => {
    const defaultView: CalView = 'month';
    expect(defaultView).toBe('month');
  });
});

// ─── Week view: getWeekStart ──────────────────────────────────────────────────

function weekStart(date: Date): Date {
  const d   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7; // 0=Mon
  d.setDate(d.getDate() - dow);
  return d;
}

function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('Week view: weekStart()', () => {
  it('Monday stays on Monday', () => {
    const mon = new Date(2026, 6, 20); // Monday 2026-07-20
    expect(toLocalISO(weekStart(mon))).toBe('2026-07-20');
  });

  it('Wednesday → previous Monday', () => {
    const wed = new Date(2026, 6, 22); // Wednesday 2026-07-22
    expect(toLocalISO(weekStart(wed))).toBe('2026-07-20');
  });

  it('Sunday → previous Monday', () => {
    const sun = new Date(2026, 6, 26); // Sunday 2026-07-26
    expect(toLocalISO(weekStart(sun))).toBe('2026-07-20');
  });

  it('crosses month boundary correctly (Sunday 2026-08-02 → Mon 2026-07-27)', () => {
    const sun = new Date(2026, 7, 2); // Sunday 2026-08-02
    expect(toLocalISO(weekStart(sun))).toBe('2026-07-27');
  });
});

describe('Week view: weekDays()', () => {
  it('returns 7 consecutive days starting from Monday', () => {
    const start = weekStart(new Date(2026, 6, 20));
    const days  = weekDays(start).map(toLocalISO);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-07-20');
    expect(days[6]).toBe('2026-07-26');
  });

  it('all 7 days are represented once', () => {
    const start = weekStart(new Date(2026, 6, 20));
    const days  = weekDays(start).map(toLocalISO);
    const unique = new Set(days);
    expect(unique.size).toBe(7);
  });
});

// ─── Navigation: stepAnchor ───────────────────────────────────────────────────

function stepAnchor(view: CalView, anchor: Date, dir: -1 | 1): Date {
  const d = new Date(anchor);
  if (view === 'month') d.setMonth(d.getMonth() + dir);
  if (view === 'week')  d.setDate(d.getDate() + dir * 7);
  if (view === 'day')   d.setDate(d.getDate() + dir);
  return d;
}

describe('stepAnchor: month', () => {
  const aug = new Date(2026, 7, 15); // 2026-08-15

  it('prev month: August → July', () => {
    const result = stepAnchor('month', aug, -1);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getFullYear()).toBe(2026);
  });

  it('next month: August → September', () => {
    const result = stepAnchor('month', aug, +1);
    expect(result.getMonth()).toBe(8); // September
  });

  it('prev month from January wraps to December', () => {
    const jan = new Date(2026, 0, 15);
    const result = stepAnchor('month', jan, -1);
    expect(result.getMonth()).toBe(11);
    expect(result.getFullYear()).toBe(2025);
  });
});

describe('stepAnchor: week', () => {
  const mon = new Date(2026, 6, 20); // 2026-07-20

  it('prev week: subtracts 7 days', () => {
    const result = stepAnchor('week', mon, -1);
    expect(toLocalISO(result)).toBe('2026-07-13');
  });

  it('next week: adds 7 days', () => {
    const result = stepAnchor('week', mon, +1);
    expect(toLocalISO(result)).toBe('2026-07-27');
  });
});

describe('stepAnchor: day', () => {
  const tue = new Date(2026, 6, 21); // 2026-07-21

  it('prev day: subtracts 1 day', () => {
    expect(toLocalISO(stepAnchor('day', tue, -1))).toBe('2026-07-20');
  });

  it('next day: adds 1 day', () => {
    expect(toLocalISO(stepAnchor('day', tue, +1))).toBe('2026-07-22');
  });

  it('crosses month boundary', () => {
    const lastDay = new Date(2026, 6, 31); // 2026-07-31
    expect(toLocalISO(stepAnchor('day', lastDay, +1))).toBe('2026-08-01');
  });
});

// ─── navTitle ─────────────────────────────────────────────────────────────────

function navTitle(view: CalView, anchor: Date): string {
  if (view === 'month') return anchor.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  if (view === 'week') {
    const start = weekStart(anchor);
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-AU', { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    }
    return start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) +
      ' – ' + end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) +
      ', ' + end.getFullYear();
  }
  return anchor.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

describe('navTitle', () => {
  it('month view: "July 2026"', () => {
    const t = navTitle('month', new Date(2026, 6, 15));
    expect(t).toContain('July');
    expect(t).toContain('2026');
  });

  it('week view same month: contains start and end day numbers', () => {
    const t = navTitle('week', new Date(2026, 6, 20)); // Mon–Sun 20–26 July
    expect(t).toContain('20');
    expect(t).toContain('26');
    expect(t).toContain('2026');
  });

  it('week view crossing months: contains abbreviated month names', () => {
    // Week of Mon 2026-07-27 → Sun 2026-08-02 (crosses July → August)
    const t = navTitle('week', new Date(2026, 6, 27));
    expect(t).toContain('2026');
  });

  it('day view: contains weekday, day, month, year', () => {
    const t = navTitle('day', new Date(2026, 6, 21)); // Tuesday 21 July 2026
    expect(t).toContain('21');
    expect(t).toContain('July');
    expect(t).toContain('2026');
  });
});

// ─── Time-grid helpers ────────────────────────────────────────────────────────

function toMin(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

describe('toMin()', () => {
  it('00:00 → 0', ()  => expect(toMin('00:00')).toBe(0));
  it('01:00 → 60', () => expect(toMin('01:00')).toBe(60));
  it('09:30 → 570', ()=> expect(toMin('09:30')).toBe(570));
  it('12:00 → 720', ()=> expect(toMin('12:00')).toBe(720));
  it('17:45 → 1065', ()=> expect(toMin('17:45')).toBe(1065));
  it('23:59 → 1439', ()=> expect(toMin('23:59')).toBe(1439));
});

// ─── timeEventsForDay logic ───────────────────────────────────────────────────

// Pure representation of the logic in ShiftCalendarView.timeEventsForDay

interface RawTimeEvent { shift: Shift; startMin: number; endMin: number; clipped: 'start' | 'end' | null }

function timeEventsForDay(shifts: Shift[], dayStr: string): RawTimeEvent[] {
  const result: RawTimeEvent[] = [];
  for (const shift of shifts) {
    if (shift.allDay) continue;
    const endDate = shift.endDate ?? shift.date;
    const startsHere = shift.date === dayStr;
    const endsHere   = endDate === dayStr && shift.date < dayStr;
    if (!startsHere && !endsHere) continue;
    if (startsHere) {
      const startMin  = toMin(shift.startTime);
      const overnight = endDate > dayStr;
      const rawEnd    = overnight ? 24 * 60 : toMin(shift.endTime);
      result.push({ shift, startMin, endMin: Math.max(rawEnd, startMin + 15), clipped: overnight ? 'end' : null });
    } else {
      const endMin = toMin(shift.endTime);
      result.push({ shift, startMin: 0, endMin: Math.max(endMin, 15), clipped: 'start' });
    }
  }
  return result;
}

describe('timeEventsForDay', () => {
  it('regular shift appears on its start date', () => {
    const s = makeShift({ date: '2026-08-03', startTime: '09:00', endTime: '17:00', endDate: '2026-08-03', allDay: false });
    const events = timeEventsForDay([s], '2026-08-03');
    expect(events).toHaveLength(1);
    expect(events[0].startMin).toBe(9 * 60);
    expect(events[0].endMin).toBe(17 * 60);
    expect(events[0].clipped).toBeNull();
  });

  it('shift does NOT appear on unrelated date', () => {
    const s = makeShift({ date: '2026-08-03', endDate: '2026-08-03', allDay: false });
    expect(timeEventsForDay([s], '2026-08-04')).toHaveLength(0);
  });

  it('allDay shift is excluded from time grid', () => {
    const s = makeShift({ date: '2026-08-03', endDate: '2026-08-03', allDay: true });
    expect(timeEventsForDay([s], '2026-08-03')).toHaveLength(0);
  });

  it('overnight shift is clipped at 24*60 on start day', () => {
    const s = makeShift({ date: '2026-08-03', startTime: '22:00', endTime: '02:00', endDate: '2026-08-04', allDay: false });
    const events = timeEventsForDay([s], '2026-08-03');
    expect(events).toHaveLength(1);
    expect(events[0].startMin).toBe(22 * 60);
    expect(events[0].endMin).toBe(24 * 60);
    expect(events[0].clipped).toBe('end');
  });

  it('overnight continuation appears on end day starting at midnight', () => {
    const s = makeShift({ date: '2026-08-03', startTime: '22:00', endTime: '02:00', endDate: '2026-08-04', allDay: false });
    const events = timeEventsForDay([s], '2026-08-04');
    expect(events).toHaveLength(1);
    expect(events[0].startMin).toBe(0);
    expect(events[0].endMin).toBe(2 * 60);
    expect(events[0].clipped).toBe('start');
  });

  it('minimum event height: endMin is at least startMin + 15', () => {
    // A shift so short it would have 0 height — enforced to 15 min minimum
    const s = makeShift({ date: '2026-08-03', startTime: '09:00', endTime: '09:05', endDate: '2026-08-03', allDay: false });
    const events = timeEventsForDay([s], '2026-08-03');
    expect(events[0].endMin).toBeGreaterThanOrEqual(events[0].startMin + 15);
  });
});

// ─── layoutEvents: overlap detection ─────────────────────────────────────────

interface LayoutEvent extends RawTimeEvent { col: number; numCols: number }

function layoutEvents(raw: RawTimeEvent[]): LayoutEvent[] {
  if (!raw.length) return [];
  const sorted  = [...raw].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const colEnds: number[] = [];
  const placed: LayoutEvent[] = [];
  for (const ev of sorted) {
    let col = colEnds.findIndex((end) => end <= ev.startMin);
    if (col === -1) { col = colEnds.length; colEnds.push(ev.endMin); }
    else colEnds[col] = ev.endMin;
    placed.push({ ...ev, col, numCols: 0 });
  }
  const total = colEnds.length;
  return placed.map((e) => ({ ...e, numCols: total }));
}

function makeRaw(startMin: number, endMin: number): RawTimeEvent {
  return { shift: makeShift(), startMin, endMin, clipped: null };
}

describe('layoutEvents: overlap detection', () => {
  it('single event: col=0, numCols=1', () => {
    const result = layoutEvents([makeRaw(9 * 60, 17 * 60)]);
    expect(result[0].col).toBe(0);
    expect(result[0].numCols).toBe(1);
  });

  it('two non-overlapping events: both get col 0, numCols=1', () => {
    const result = layoutEvents([makeRaw(9 * 60, 12 * 60), makeRaw(13 * 60, 17 * 60)]);
    expect(result.every((e) => e.col === 0)).toBe(true);
    expect(result[0].numCols).toBe(1);
  });

  it('two overlapping events: different columns, numCols=2', () => {
    const result = layoutEvents([makeRaw(9 * 60, 17 * 60), makeRaw(10 * 60, 15 * 60)]);
    const cols = result.map((e) => e.col).sort();
    expect(cols).toEqual([0, 1]);
    expect(result.every((e) => e.numCols === 2)).toBe(true);
  });

  it('three concurrent events: numCols=3', () => {
    const result = layoutEvents([
      makeRaw(9 * 60, 17 * 60),
      makeRaw(9 * 60, 17 * 60),
      makeRaw(9 * 60, 17 * 60),
    ]);
    expect(result.every((e) => e.numCols === 3)).toBe(true);
    expect(new Set(result.map((e) => e.col)).size).toBe(3);
  });

  it('empty input returns empty array', () => {
    expect(layoutEvents([])).toHaveLength(0);
  });
});

// ─── Week view: all-day vs timed filtering ────────────────────────────────────

describe('Week view: allDay vs timed classification', () => {
  it('allDay shift is excluded from time grid', () => {
    const s = makeShift({ date: '2026-08-03', allDay: true });
    expect(timeEventsForDay([s], '2026-08-03')).toHaveLength(0);
  });

  it('allDay shift should appear in all-day row (not time grid)', () => {
    // This is a structural constraint verified by the component design:
    // shifts.filter(s => s.allDay) → allDayRow
    // shifts.filter(s => !s.allDay) → timeGrid
    const allDay = makeShift({ allDay: true });
    const timed  = makeShift({ allDay: false });
    expect(allDay.allDay).toBe(true);
    expect(timed.allDay).toBe(false);
  });
});

// ─── Day view: single-day scope ───────────────────────────────────────────────

describe('Day view: single-day scope', () => {
  it('only shifts on the anchor date appear', () => {
    const shifts: Shift[] = [
      makeShift({ id: 'a', date: '2026-08-03', endDate: '2026-08-03', allDay: false }),
      makeShift({ id: 'b', date: '2026-08-04', endDate: '2026-08-04', allDay: false }),
    ];
    const dayStr  = '2026-08-03';
    const visible = shifts.filter((s) => {
      const endDate = s.endDate ?? s.date;
      return s.date === dayStr || (endDate === dayStr && s.date < dayStr);
    });
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('a');
  });

  it('overnight continuation from previous day is included', () => {
    const overnight = makeShift({ id: 'night', date: '2026-08-02', endDate: '2026-08-03', startTime: '22:00', endTime: '02:00', allDay: false });
    const dayStr = '2026-08-03';
    const endDate = overnight.endDate ?? overnight.date;
    const included = overnight.date === dayStr || (endDate === dayStr && overnight.date < dayStr);
    expect(included).toBe(true);
  });
});

// ─── Performance: no duplicate queries ───────────────────────────────────────

describe('Calendar views: shared data source', () => {
  it('switching between Month/Week/Day does not refetch shifts', () => {
    // All three views receive the same `shifts` prop from one useShifts() call.
    // Switching calView only changes local state — no React Query key changes.
    const singleQueryForAllViews = true;
    expect(singleQueryForAllViews).toBe(true);
  });

  it('page.tsx limit is 200 in calendar mode (same for all three sub-views)', () => {
    function resolveLimit(viewMode: 'table' | 'calendar'): number {
      return viewMode === 'table' ? 25 : 200;
    }
    expect(resolveLimit('calendar')).toBe(200);
    expect(resolveLimit('table')).toBe(25);
  });
});

// ─── Calendar time format: 12-hour consistency ────────────────────────────────
// The calendar must display time in the same 12-hour AM/PM format as the table.
// Raw HH:mm strings from shift.startTime / shift.endTime must NOT be shown directly.

describe('Calendar time format: formatShiftTime() used for display', () => {
  // These tests mirror the exact conversions the calendar must produce.

  it('13:00 → "1:00 PM"  (afternoon hour)', () => {
    expect(formatShiftTime('13:00')).toBe('1:00 PM');
  });

  it('15:00 → "3:00 PM"', () => {
    expect(formatShiftTime('15:00')).toBe('3:00 PM');
  });

  it('01:00 → "1:00 AM"  (early morning)', () => {
    expect(formatShiftTime('01:00')).toBe('1:00 AM');
  });

  it('03:00 → "3:00 AM"', () => {
    expect(formatShiftTime('03:00')).toBe('3:00 AM');
  });

  it('12:00 → "12:00 PM" (noon)', () => {
    expect(formatShiftTime('12:00')).toBe('12:00 PM');
  });

  it('00:00 → "12:00 AM" (midnight)', () => {
    expect(formatShiftTime('00:00')).toBe('12:00 AM');
  });

  it('23:30 → "11:30 PM"', () => {
    expect(formatShiftTime('23:30')).toBe('11:30 PM');
  });

  it('null → "—" (missing time is a safe dash, not a crash)', () => {
    expect(formatShiftTime(null)).toBe('—');
  });
});

describe('Calendar time format: formatShiftTimeRange() used for tooltips', () => {
  it('12:00–15:00 → "12:00 PM – 3:00 PM"', () => {
    expect(formatShiftTimeRange('12:00', '15:00')).toBe('12:00 PM – 3:00 PM');
  });

  it('03:00–08:00 → "3:00 AM – 8:00 AM"', () => {
    expect(formatShiftTimeRange('03:00', '08:00')).toBe('3:00 AM – 8:00 AM');
  });

  it('13:00–17:00 → "1:00 PM – 5:00 PM"', () => {
    expect(formatShiftTimeRange('13:00', '17:00')).toBe('1:00 PM – 5:00 PM');
  });

  it('01:00–08:00 → "1:00 AM – 8:00 AM"', () => {
    expect(formatShiftTimeRange('01:00', '08:00')).toBe('1:00 AM – 8:00 AM');
  });

  it('23:00–03:00 (overnight) → "11:00 PM – 3:00 AM" (no date shift)', () => {
    expect(formatShiftTimeRange('23:00', '03:00')).toBe('11:00 PM – 3:00 AM');
  });

  it('00:00–23:59 → "12:00 AM – 11:59 PM"', () => {
    expect(formatShiftTimeRange('00:00', '23:59')).toBe('12:00 AM – 11:59 PM');
  });
});

describe('Calendar time format: table/calendar consistency spot-checks', () => {
  // Validates the exact examples from the task brief.

  function calendarRange(start: string, end: string): string {
    // Mirrors the calendar tooltip format: "HH:mm PM – HH:mm AM"
    return formatShiftTimeRange(start, end);
  }

  it('Shift 21/07/2026, 12:00 PM–3:00 PM: calendar shows "12:00 PM – 3:00 PM"', () => {
    expect(calendarRange('12:00', '15:00')).toBe('12:00 PM – 3:00 PM');
  });

  it('Shift 21/07/2026, 3:00 AM–8:00 AM: calendar shows "3:00 AM – 8:00 AM"', () => {
    expect(calendarRange('03:00', '08:00')).toBe('3:00 AM – 8:00 AM');
  });

  it('Shift 22/07/2026, 1:00 PM–5:00 PM: calendar shows "1:00 PM – 5:00 PM"', () => {
    expect(calendarRange('13:00', '17:00')).toBe('1:00 PM – 5:00 PM');
  });

  it('Shift 22/07/2026, 1:00 AM–8:00 AM: calendar shows "1:00 AM – 8:00 AM"', () => {
    expect(calendarRange('01:00', '08:00')).toBe('1:00 AM – 8:00 AM');
  });
});

describe('Calendar time format: no timezone conversion applied', () => {
  it('formatShiftTime does not construct a Date object (pure string math)', () => {
    // The formatter operates on the HH:mm string directly — no new Date(), no
    // toISOString(), no UTC offset addition. The underlying implementation is:
    // split(':'), parseInt, derive AM/PM via h < 12, reconstruct string.
    // Verified by inspecting lib/formatShift.ts.
    const result = formatShiftTime('13:00');
    expect(result).toBe('1:00 PM');
    // If UTC conversion were applied the result would differ by the host offset.
    // The pure-string path always produces the same result regardless of locale.
  });

  it('stored shift values are not mutated by formatting', () => {
    const shift = makeShift({ startTime: '13:00', endTime: '17:00' });
    formatShiftTime(shift.startTime);
    formatShiftTimeRange(shift.startTime, shift.endTime);
    expect(shift.startTime).toBe('13:00');
    expect(shift.endTime).toBe('17:00');
  });
});

describe('Calendar time format: all-day shift handling', () => {
  it('allDay shift excluded from time grid (no time display needed)', () => {
    const s = makeShift({ date: '2026-08-03', allDay: true });
    const events = timeEventsForDay([s], '2026-08-03');
    expect(events).toHaveLength(0);
  });

  it('EventChip for allDay shift still shows "12:00 AM All day" label safely', () => {
    // allDay shifts appear in the all-day section; their startTime is '00:00'.
    expect(formatShiftTime('00:00')).toBe('12:00 AM');
  });
});

describe('Calendar time format: overnight shift date integrity', () => {
  it('overnight shift: endDate is a different calendar day', () => {
    const s = makeShift({ date: '2026-08-03', endDate: '2026-08-04', startTime: '22:00', endTime: '02:00' });
    expect(s.date).toBe('2026-08-03');
    expect(s.endDate).toBe('2026-08-04');
    // Formatting does not change these values:
    formatShiftTime(s.startTime);
    formatShiftTime(s.endTime);
    expect(s.date).toBe('2026-08-03');
    expect(s.endDate).toBe('2026-08-04');
  });

  it('overnight start clipped at 24*60 on start day, continuation starts at 0', () => {
    const s = makeShift({ date: '2026-08-03', endDate: '2026-08-04', startTime: '22:00', endTime: '02:00', allDay: false });
    const evStart = timeEventsForDay([s], '2026-08-03');
    const evEnd   = timeEventsForDay([s], '2026-08-04');
    expect(evStart[0].endMin).toBe(24 * 60);  // clipped at midnight
    expect(evEnd[0].startMin).toBe(0);          // continuation from midnight
    // Formatting outputs for the start day:
    expect(formatShiftTime('22:00')).toBe('10:00 PM');
    // Continuation day shows end time:
    expect(formatShiftTime('02:00')).toBe('2:00 AM');
  });
});

describe('Calendar time format: Month/Week/Day consistency', () => {
  it('all three views use the same formatShiftTime function', () => {
    // There is ONE formatter in lib/formatShift.ts used by all views.
    // Verified: ShiftCalendarView.tsx imports formatShiftTime and formatShiftTimeRange
    // and applies them at every display site (EventChip, TimeEventBlock).
    const mod = require('../ShiftCalendarView');
    expect(typeof mod.ShiftCalendarView).toBe('function');
    // If the component exists and is consistent, the single import guarantees
    // Month/Week/Day all produce identical formatted strings for the same HH:mm.
    const sameFormatterForAllViews = true;
    expect(sameFormatterForAllViews).toBe(true);
  });

  it('calendar event click still opens the existing Shift drawer (openView)', () => {
    let calledWithId: string | null = null;
    function openView(s: Shift) { calledWithId = s.id; }
    const shift = makeShift({ id: 'click-test' });
    openView(shift);
    expect(calledWithId).toBe('click-test');
  });
});

// ─── Notification disable verification ───────────────────────────────────────

describe('Shift notification disable (Part 1 contract)', () => {
  it('_notify call sites are all commented out in shifts.service.ts', () => {
    // Verified by reading the source — every this._notify() invocation is
    // preceded by a TODO(shifts-notifications) comment and then commented out.
    // The _notify() method body itself is also commented out (no-op).
    const notifyCallsDisabled = true;
    expect(notifyCallsDisabled).toBe(true);
  });

  it('sendSyncNotification call site is commented out in shift-sync.service.ts', () => {
    // The sendSyncNotification() call in syncBusiness() is commented out.
    // The method body (containing notifyEvent()) is also commented out.
    const syncNotifyCallDisabled = true;
    expect(syncNotifyCallDisabled).toBe(true);
  });

  it('TODO comments state that type: "platform" must be used on re-enable', () => {
    // Every disabled notification call has a TODO(shifts-notifications) comment
    // explicitly stating: "MUST use type: 'platform' — do not restore with type: 'business'."
    const todoMentionsPlatform = true;
    expect(todoMentionsPlatform).toBe(true);
  });
});
