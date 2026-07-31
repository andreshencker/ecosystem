import type { ShiftInvoiceBiResult } from '../shift-invoice.types';
import type {
  ShiftInvoiceXlsxDto,
  ShiftInvoiceXlsxLineItemDto,
} from './shift-invoice-xlsx.dto';

export function mapShiftInvoiceToXlsx(result: ShiftInvoiceBiResult): ShiftInvoiceXlsxDto {
  const lineItems: ShiftInvoiceXlsxLineItemDto[] = result.workedHours.map((row) => ({
    shiftId:     row.shiftId,
    workDate:    row.workDate,
    description: row.description,
    startTime:   row.startTime,
    endTime:     row.endTime,
    workedHours: row.workedHours,
    hourlyRate:  row.hourlyRate,
    amount:      row.amount,
  }));

  return {
    summary: {
      companyName:  result.company.companyName,
      abn:          result.company.abn,
      companyEmail: result.company.email,
      companyPhone: result.company.phone,

      customerName:  result.customer.customerName,
      customerEmail: result.customer.email,
      customerPhone: result.customer.phone,

      invoiceNumber: result.invoice.invoiceNumber,
      invoiceDate:   result.invoice.invoiceDate,
      dueDate:       result.invoice.dueDate,
      status:        result.invoice.status,
      currency:      result.invoice.currency,
      contractTitle: result.invoice.contractTitle,

      subtotal:  result.totals.subtotal,
      taxAmount: result.totals.taxAmount,
      total:     result.totals.total,
      chargeGst: result.totals.chargeGst,
    },
    lineItems,
  };
}
