/**
 * Response shape for the /internal/invoices/summary BI endpoint.
 * Mirrors the InvoiceSummaryResponse Pydantic model.
 * Monetary amounts are returned as decimal strings to preserve precision.
 */
export interface InvoiceScopeDto {
  companyId: string;
  dateFrom: string | null;
  dateTo: string | null;
  currency: string;
  customerId: string | null;
}

export interface InvoiceSummaryStatsDto {
  invoiceCount: number;
  totalInvoiced: string;
  totalSubtotal: string;
  totalTax: string;
  averageInvoiceValue: string;
  averageDaysToPayment: string;
}

export interface StatusBreakdownItemDto {
  status: string;
  count: number;
  total: string;
}

export interface InvoiceContractMetadataDto {
  source: string;
  lastSyncedAt: string | null;
  currencyGroupingApplied: boolean;
}

export interface InvoiceSummaryResult {
  contract: string;
  version: string;
  scope: InvoiceScopeDto;
  generatedAt: string;
  summary: InvoiceSummaryStatsDto;
  statusBreakdown: StatusBreakdownItemDto[];
  metadata: InvoiceContractMetadataDto;
}
