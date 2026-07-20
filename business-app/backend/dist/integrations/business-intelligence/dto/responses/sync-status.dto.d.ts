export interface SyncModelState {
    model_name: string;
    company_id: string;
    last_status: string;
    last_cursor: string | null;
    last_started_at: string | null;
    last_completed_at: string | null;
    last_error: string | null;
    records_processed: number;
}
export interface SyncStatus {
    companyId: string;
    models: SyncModelState[];
    availableModels: string[];
}
