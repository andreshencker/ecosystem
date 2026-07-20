import type { BusinessSyncResult } from '../interfaces/sync-result.interface';
export declare class SyncResultDto implements BusinessSyncResult {
    businessId: string;
    calendars: BusinessSyncResult['calendars'];
    totalCreated: number;
    totalUpdated: number;
    totalDeleted: number;
    totalErrors: number;
    totalDurationMs: number;
    startedAt: string;
    finishedAt: string;
}
