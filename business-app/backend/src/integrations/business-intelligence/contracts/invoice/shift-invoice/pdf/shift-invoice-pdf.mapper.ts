// Mapper: ShiftInvoiceBiResult → ShiftInvoicePdfDto
//
// No calculations. No formatting. Only structural adaptation.
// Neither breakTaken nor breakMinutes are forwarded — BI delivers net workedHours.

import type { ShiftInvoiceBiResult } from '../shift-invoice.types';
import type {
  ShiftInvoicePdfDto,
  ShiftInvoicePdfLineItemDto,
  ShiftInvoicePdfTotalsDto,
} from './shift-invoice-pdf.dto';

export function mapShiftInvoiceToPdf(result: ShiftInvoiceBiResult): ShiftInvoicePdfDto {
  const lineItems: ShiftInvoicePdfLineItemDto[] = result.workedHours.map((row) => ({
    shiftId:     row.shiftId,
    workDate:    row.workDate,
    description: row.description,
    startTime:   row.startTime,
    endTime:     row.endTime,
    workedHours: row.workedHours,
    hourlyRate:  row.hourlyRate,
    amount:      row.amount,
  }));

  const totals: ShiftInvoicePdfTotalsDto = {
    subtotal:  result.totals.subtotal,
    taxRate:   result.totals.taxRate,
    taxAmount: result.totals.taxAmount,
    total:     result.totals.total,
    chargeGst: result.totals.chargeGst,
    currency:  result.totals.currency,
  };

  const paymentNotes: string[] = buildPaymentNotes(result);

  return {
    header: {
      company: {
        businessId:  result.company.businessId,
        companyName: result.company.companyName,
        abn:         result.company.abn,
        address:     result.company.address,
        email:       result.company.email,
        phone:       result.company.phone,
      },
      customer: {
        customerId:   result.customer.customerId,
        customerName: result.customer.customerName,
        email:        result.customer.email,
        phone:        result.customer.phone,
        address:      result.customer.address,
      },
    },
    invoice: {
      invoiceNumber: result.invoice.invoiceNumber,
      invoiceDate:   result.invoice.invoiceDate,
      dueDate:       result.invoice.dueDate,
      status:        result.invoice.status,
      currency:      result.invoice.currency,
      contractTitle: result.invoice.contractTitle,
    },
    lineItems,
    totals,
    paymentNotes,
  };
}

/** Assembles the payment notes bullet list from the payment and notes fields. */
function buildPaymentNotes(result: ShiftInvoiceBiResult): string[] {
  const items: string[] = [];
  const p = result.paymentInformation;
  const n = result.notes;

  if (p.bankName)       items.push(`Bank: ${p.bankName}`);
  if (p.accountName)    items.push(`Account Name: ${p.accountName}`);
  if (p.bsb)            items.push(`BSB: ${p.bsb}`);
  if (p.accountNumber)  items.push(`Account Number: ${p.accountNumber}`);
  if (p.paymentReference) items.push(`Reference: ${p.paymentReference}`);
  if (p.paymentDueDate) items.push(`Due Date: ${p.paymentDueDate}`);
  if (n.paymentNotes)   items.push(n.paymentNotes);
  if (n.invoiceNotes)   items.push(n.invoiceNotes);
  if (n.terms)          items.push(n.terms);

  return items;
}
