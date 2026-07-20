/**
 * Response shape for the /internal/dashboard/summary endpoint.
 * Matches the DashboardSummaryResponse Pydantic model from the BI service.
 */
export interface DashboardSummaryResult {
  businessId: string;
  period?: string | null;
  customers: {
    total: number;
    active: number;
    newThisPeriod: number;
  };
  calculatedAt: string;
}
