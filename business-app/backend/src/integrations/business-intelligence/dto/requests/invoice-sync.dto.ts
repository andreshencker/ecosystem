/**
 * Request/response shapes for BusinessIntelligenceService.syncInvoices.
 * Wraps the POST /internal/sync/invoices endpoint of the BI service.
 */
export interface InvoiceSyncRequest {
  companyId: string;
  full?: boolean;
}

export interface InvoiceSyncResult {
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
