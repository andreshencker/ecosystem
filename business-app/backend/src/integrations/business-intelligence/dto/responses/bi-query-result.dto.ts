/**
 * Response shape for POST /internal/query on the BI service.
 * Mirrors the QueryResponse Pydantic model.
 */
export interface BiQueryMetadata {
  businessId: string;
  domain: string;
  generatedAt: string;
  rowCount: number;
  measures: string[];
  kpis: string[];
  groupBy: string[];
}

export interface BiQueryResult {
  domain: string;
  rows: Array<Record<string, unknown>>;
  kpis: Record<string, unknown>;
  metadata: BiQueryMetadata;
}
