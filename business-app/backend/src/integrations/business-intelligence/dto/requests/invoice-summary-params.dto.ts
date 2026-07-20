/**
 * Query params passed to BusinessIntelligenceService.getInvoiceSummary.
 * businessId is always resolved server-side from JWT — never from the client.
 */
export interface InvoiceSummaryParams {
  businessId: string;
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  customerId?: string;
}
