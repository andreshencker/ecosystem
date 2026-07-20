/**
 * TypeScript DTOs mirroring the BI Python ShiftAssignment Pydantic schemas.
 * All values come from BI — no calculations are performed in NestJS.
 */

export interface BiShiftPendingAssignmentItem {
  shiftId: string;
  businessId: string;

  shiftDate: string | null;
  startTime: string | null;
  endTime: string | null;
  title: string | null;
  location: string | null;

  linkedCalendarId: string | null;
  calendarName: string | null;
  calendarProvider: string | null;
  calendarAccount: string | null;

  contractId: string | null;
  contractAssigned: boolean;

  taskCode: string;
  taskAgeDays: number | null;

  syncStatus: string | null;
  lastExternalUpdate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BiShiftPendingAssignmentListResponse {
  businessId: string | null;
  items: BiShiftPendingAssignmentItem[];
  total: number;
  page: number;
  limit: number;
  calculatedAt: string;
}

export interface BiShiftPendingSummaryResponse {
  businessId: string | null;

  totalShifts: number;
  calendarImportedShifts: number;
  manualShifts: number;
  importedWithContract: number;
  importedPendingContract: number;
  deletedImportedShifts: number;

  /** null when denominator (active calendar-imported shifts) is zero */
  shiftContractAssignmentRate: number | null;
  pendingContractAssignmentRate: number | null;

  /**
   * ISO datetime of the most recent BI ETL upsert for this business.
   * null means the shift ETL has never run — a zero importedPendingContract
   * in that case does NOT mean "all assigned": fact_shift is simply empty.
   */
  etlSyncedAt: string | null;

  calculatedAt: string;
}

export interface BiShiftAssignmentListParams {
  businessId?: string;
  linkedCalendarId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAgeDays?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
}
