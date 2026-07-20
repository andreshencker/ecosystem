/**
 * Common query parameters for all BI service requests.
 * businessId is always resolved server-side from JWT — never from the frontend.
 */
export interface BiQueryParams {
  /** Tenant identifier, resolved from AuthContext.companyId */
  businessId: string;
  /** Optional YYYY-MM period filter */
  period?: string;
}
