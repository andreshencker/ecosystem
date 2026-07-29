import type { ShiftDocument, ShiftStatus, SyncStatus } from '../schemas/shift.schema';

export interface ContractSummary {
  id:           string;
  customerId:   string | null;
  customerName: string | null;
  positionName: string;
}

export interface ShiftResponseDto {
  id:           string;
  businessId:   string;
  contractId:   string | null;
  customerId:   string | null;
  contract:     ContractSummary | null;
  date:         string;        // YYYY-MM-DD — local start date in the event timezone
  startTime:    string;        // HH:mm — local start time
  endDate:      string | null; // YYYY-MM-DD — local end date; null for pre-endDate records (treat as same as date)
  endTime:      string;        // HH:mm — local end time
  /** Whether the worker took their contractual break. Break duration is resolved by BI from the Contract. */
  breakTaken: boolean;
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

export function toShiftResponse(
  doc: ShiftDocument | Record<string, any>,
): ShiftResponseDto {
  const d = doc as any;
  const toISO = (v: any): string =>
    v instanceof Date ? v.toISOString() : String(v ?? '');

  return {
    id:           String(d._id),
    businessId:   d.businessId,
    contractId:   d.contractId   ?? null,
    customerId:   d.customerId   ?? null,
    contract:     d.contractSummary ?? null,
    date:         d.date,
    startTime:    d.startTime,
    endDate:      d.endDate      ?? null,
    endTime:      d.endTime,
    breakTaken:   d.breakTaken  ?? false,
    status:       d.status,
    location:     d.location     ?? null,
    notes:        d.notes        ?? null,

    createdFromCalendar: d.createdFromCalendar ?? false,
    contractAssigned:    d.contractAssigned    ?? false,
    syncStatus:          d.syncStatus          ?? null,
    linkedCalendarId:    d.linkedCalendarId    ?? null,
    calendarProvider:    d.calendarProvider    ?? null,
    calendarAccount:     d.calendarAccount     ?? null,
    calendarName:        d.calendarName        ?? null,
    title:               d.title               ?? null,
    allDay:              d.allDay              ?? false,
    timezone:            d.timezone            ?? null,

    createdAt: toISO(d.createdAt),
    updatedAt: toISO(d.updatedAt),
  };
}
