import type { ShiftInvoiceFormat } from './shift-invoice.types';
import type { ShiftInvoicePdfDto } from './pdf/shift-invoice-pdf.dto';
import type { ShiftInvoiceXlsxDto } from './xlsx/shift-invoice-xlsx.dto';
import type { ShiftInvoiceCsvDto } from './csv/shift-invoice-csv.dto';
import type { ShiftInvoiceHtmlDto } from './html/shift-invoice-html.dto';
import type { ShiftInvoiceJsonDto } from './json/shift-invoice-json.dto';
import type { ShiftInvoiceXmlDto } from './xml/shift-invoice-xml.dto';
export type ShiftInvoiceContractResult = ShiftInvoicePdfDto | ShiftInvoiceXlsxDto | ShiftInvoiceCsvDto | ShiftInvoiceHtmlDto | ShiftInvoiceJsonDto | ShiftInvoiceXmlDto;
export declare class ShiftInvoiceService {
    generate(businessId: string, invoiceId: string, format: ShiftInvoiceFormat): Promise<ShiftInvoiceContractResult>;
    private dispatch;
    private fetchBiResult;
}
