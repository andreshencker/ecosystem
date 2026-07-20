/**
 * Request body for the generic /internal/query endpoint of the BI service.
 * businessId is always resolved server-side from JWT.
 */
export interface BiQueryRequest {
  businessId: string;
  domain: string;
  dimensions?: string[];
  measures?: string[];
  kpis?: string[];
  filters?: Record<string, unknown>;
  groupBy?: string[];
  orderBy?: string[];
  limit?: number;
  offset?: number;
}
