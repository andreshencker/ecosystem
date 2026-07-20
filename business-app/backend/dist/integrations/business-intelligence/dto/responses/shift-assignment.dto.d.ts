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
    shiftContractAssignmentRate: number | null;
    pendingContractAssignmentRate: number | null;
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
