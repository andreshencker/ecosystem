// Public surface of the Shift Invoice BI contract.
// Consumers import types and the module from this single location.

export { ShiftInvoiceModule }   from './shift-invoice.module';
export { ShiftInvoiceService }  from './shift-invoice.service';
export type { ShiftInvoiceContractResult } from './shift-invoice.service';

// Shared types
export type {
  ShiftInvoiceFormat,
  ShiftInvoiceBiResult,
  ShiftInvoiceCompany,
  ShiftInvoiceCustomer,
  ShiftInvoiceMeta,
  ShiftInvoiceWorkedHoursRow,
  ShiftInvoiceTotals,
  ShiftInvoicePaymentInformation,
  ShiftInvoiceNotes,
  ShiftInvoiceGenerationMetadata,
} from './shift-invoice.types';
export { SHIFT_INVOICE_FORMATS } from './shift-invoice.types';

// Format DTOs
export type { ShiftInvoicePdfDto }  from './pdf/shift-invoice-pdf.dto';
export type { ShiftInvoiceXlsxDto } from './xlsx/shift-invoice-xlsx.dto';
export type { ShiftInvoiceCsvDto }  from './csv/shift-invoice-csv.dto';
export type { ShiftInvoiceHtmlDto } from './html/shift-invoice-html.dto';
export type { ShiftInvoiceJsonDto } from './json/shift-invoice-json.dto';
export type { ShiftInvoiceXmlDto }  from './xml/shift-invoice-xml.dto';

// Format mappers
export { mapShiftInvoiceToPdf }  from './pdf/shift-invoice-pdf.mapper';
export { mapShiftInvoiceToXlsx } from './xlsx/shift-invoice-xlsx.mapper';
export { mapShiftInvoiceToCsv }  from './csv/shift-invoice-csv.mapper';
export { mapShiftInvoiceToHtml } from './html/shift-invoice-html.mapper';
export { mapShiftInvoiceToJson } from './json/shift-invoice-json.mapper';
export { mapShiftInvoiceToXml }  from './xml/shift-invoice-xml.mapper';
