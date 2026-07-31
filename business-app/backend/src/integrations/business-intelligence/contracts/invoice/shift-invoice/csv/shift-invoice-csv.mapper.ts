import type { ShiftInvoiceBiResult } from '../shift-invoice.types';
import type {
  ShiftInvoiceCsvDto,
  ShiftInvoiceCsvLineItemDto,
} from './shift-invoice-csv.dto';

export function mapShiftInvoiceToCsv(result: ShiftInvoiceBiResult): ShiftInvoiceCsvDto {
  const lineItems: ShiftInvoiceCsvLineItemDto[] = result.workedHours.map((row) => ({
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
    metadata: {
      invoiceNumber: result.invoice.invoiceNumber,
      invoiceDate:   result.invoice.invoiceDate,
      dueDate:       result.invoice.dueDate,
      status:        result.invoice.status,
      currency:      result.invoice.currency,
      companyName:   result.company.companyName,
      abn:           result.company.abn,
      customerName:  result.customer.customerName,
      subtotal:      result.totals.subtotal,
      taxAmount:     result.totals.taxAmount,
      total:         result.totals.total,
    },
    lineItems,
  };
}
