export type ShiftStatus = 'draft' | 'confirmed' | 'cancelled';
export type SyncStatus  = 'pending' | 'synced' | 'deleted' | 'error';

export const STATUS_LABELS: Record<ShiftStatus, string> = {
  draft:     'Draft',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

export interface Shift {
  id:           string;
  businessId:   string;
  contractId:   string | null;
  customerId:   string | null;
  date:         string;        // YYYY-MM-DD — local start date in the event timezone
  startTime:    string;        // HH:mm
  /** YYYY-MM-DD — local end date. null for records created before this field was added (treat as same as date). */
  endDate:      string | null;
  endTime:      string;        // HH:mm
  breakMinutes: number | null;
  status:       ShiftStatus;
  location:     string | null;
  notes:        string | null;

  // Calendar sync fields
  createdFromCalendar: boolean;
  contractAssigned:    boolean;
  syncStatus:          SyncStatus | null;
  linkedCalendarId:    string | null;
  calendarProvider:    string | null;
  calendarAccount:     string | null;
  calendarName:        string | null;
  title:               string | null;
  allDay:              boolean;
  timezone:            string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ShiftListResponse {
  items: Shift[];
  total: number;
  page:  number;
  limit: number;
}

export interface CreateShiftPayload {
  contractId:       string;
  /** LinkedCalendar MongoDB ID (flow=shifts). When supplied, creates a provider calendar event. */
  linkedCalendarId?: string;
  /** Title for the provider calendar event. Defaults to contract position name. */
  title?:           string;
  date:             string;
  startTime:        string;
  endTime:          string;
  breakMinutes?:    number;
  status?:          ShiftStatus;
  location?:        string;
  notes?:           string;
}

export interface UpdateShiftPayload {
  title?:         string | null;
  date?:          string;
  startTime?:     string;
  endTime?:       string;
  breakMinutes?:  number | null;
  location?:      string | null;
  notes?:         string | null;
}

export interface SyncHistoryEntry {
  _id:               string;
  businessId:        string;
  linkedCalendarId:  string | null;
  calendarName:      string | null;
  accountIdentifier: string | null;
  providerKey:       string | null;
  startedAt:         string;
  finishedAt:        string | null;
  eventsReceived:    number;
  created:           number;
  updated:           number;
  deleted:           number;
  skipped:           number;
  errors:            string[];
  durationMs:        number | null;
  status:            'running' | 'completed' | 'failed';
}

export interface SyncHistoryResponse {
  items: SyncHistoryEntry[];
  total: number;
  page:  number;
  limit: number;
}

/** Mirrors BiShiftPendingSummaryResponse from the BI service. All values come from BI. */
export interface ShiftAssignmentSummary {
  businessId: string | null;
  totalShifts: number;
  calendarImportedShifts: number;
  manualShifts: number;
  importedWithContract: number;
  /** Imported Shifts that still need a Contract — the primary action count. */
  importedPendingContract: number;
  deletedImportedShifts: number;
  /** null when no active calendar-imported Shifts exist (denominator is zero). */
  shiftContractAssignmentRate:    number | null;
  pendingContractAssignmentRate:  number | null;
  /**
   * When the BI ETL last populated fact_shift for this business (server-managed
   * PostgreSQL timestamp). null means the shift ETL has never run.
   * A zero importedPendingContract with etlSyncedAt=null is NOT "all assigned" —
   * it means fact_shift is empty and the count is unreliable.
   */
  etlSyncedAt:                    string | null;
  calculatedAt: string;
}

/**
 * A single imported Shift waiting for Contract assignment, as reported by BI.
 * Source of truth for the pending rule lives exclusively in the BI repository.
 * The frontend never re-derives this list from the operational Shift table.
 */
export interface ShiftPendingItem {
  shiftId:        string;
  businessId:     string;
  shiftDate:      string | null;
  startTime:      string | null;
  endTime:        string | null;
  title:          string | null;
  location:       string | null;
  linkedCalendarId:  string | null;
  calendarName:      string | null;
  calendarProvider:  string | null;
  calendarAccount:   string | null;
  contractId:        string | null;
  contractAssigned:  boolean;
  taskCode:          string;
  taskAgeDays:       number | null;
  syncStatus:        string | null;
  lastExternalUpdate: string | null;
  createdAt:         string | null;
  updatedAt:         string | null;
}

export interface ShiftPendingListResponse {
  businessId:  string | null;
  items:       ShiftPendingItem[];
  total:       number;
  page:        number;
  limit:       number;
  calculatedAt: string;
}

/** Payload for PATCH /shifts/contracts/bulk — one atomic assignment for multiple Shifts. */
export interface BulkAssignContractPayload {
  assignments: Array<{ shiftId: string; contractId: string }>;
}

/** Success response from PATCH /shifts/contracts/bulk. */
export interface BulkAssignContractResult {
  success:  true;
  total:    number;
  updated:  number;
  /** Orphaned BI records skipped because the MongoDB shift no longer exists. */
  skipped:  number;
  shiftIds: string[];
}

/** Per-shift validation error returned when the bulk endpoint rejects one or more assignments. */
export interface BulkAssignContractError {
  shiftId: string;
  code:    string;
  message: string;
}

/** Result of syncing a single linked calendar. Matches CalendarSyncStats from the backend. */
export interface CalendarSyncResult {
  linkedCalendarId:  string;
  calendarName:      string;
  accountIdentifier: string;
  eventsReceived:    number;
  created:           number;
  updated:           number;
  deleted:           number;
  skipped:           number;
  errors:            string[];
  durationMs:        number;
  status:            'completed' | 'failed';
}

export interface BusinessSyncResult {
  businessId:      string;
  totalCreated:    number;
  totalUpdated:    number;
  totalDeleted:    number;
  totalErrors:     number;
  totalDurationMs: number;
  startedAt:       string;
  finishedAt:      string;
  calendars: Array<{
    linkedCalendarId:  string;
    calendarName:      string;
    accountIdentifier: string;
    eventsReceived:    number;
    created:           number;
    updated:           number;
    deleted:           number;
    skipped:           number;
    errors:            string[];
    durationMs:        number;
    status:            'completed' | 'failed';
  }>;
}
