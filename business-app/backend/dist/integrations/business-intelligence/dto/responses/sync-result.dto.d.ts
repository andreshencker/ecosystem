export interface SyncResult {
    model_name: string;
    company_id: string;
    extracted: number;
    transformed: number;
    inserted: number;
    updated: number;
    failed: number;
    duration_ms: number | null;
    errors: string[];
}
