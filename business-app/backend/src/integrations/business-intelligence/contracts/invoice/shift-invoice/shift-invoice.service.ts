import { Injectable, NotImplementedException } from '@nestjs/common';

import type { ShiftInvoiceBiResult, ShiftInvoiceFormat } from './shift-invoice.types';
import type { ShiftInvoicePdfDto } from './pdf/shift-invoice-pdf.dto';
import type { ShiftInvoiceXlsxDto } from './xlsx/shift-invoice-xlsx.dto';
import type { ShiftInvoiceCsvDto } from './csv/shift-invoice-csv.dto';
import type { ShiftInvoiceHtmlDto } from './html/shift-invoice-html.dto';
import type { ShiftInvoiceJsonDto } from './json/shift-invoice-json.dto';
import type { ShiftInvoiceXmlDto } from './xml/shift-invoice-xml.dto';

import { mapShiftInvoiceToPdf }  from './pdf/shift-invoice-pdf.mapper';
import { mapShiftInvoiceToXlsx } from './xlsx/shift-invoice-xlsx.mapper';
import { mapShiftInvoiceToCsv }  from './csv/shift-invoice-csv.mapper';
import { mapShiftInvoiceToHtml } from './html/shift-invoice-html.mapper';
import { mapShiftInvoiceToJson } from './json/shift-invoice-json.mapper';
import { mapShiftInvoiceToXml }  from './xml/shift-invoice-xml.mapper';

export type ShiftInvoiceContractResult =
  | ShiftInvoicePdfDto
  | ShiftInvoiceXlsxDto
  | ShiftInvoiceCsvDto
  | ShiftInvoiceHtmlDto
  | ShiftInvoiceJsonDto
  | ShiftInvoiceXmlDto;

/**
 * Orchestrates shift-invoice contract generation.
 *
 * Responsibilities:
 *  1. Accept a format and invoice parameters.
 *  2. Obtain the generic BI result (placeholder — real BI call wired in Sprint N+1).
 *  3. Dispatch to the appropriate format mapper.
 *  4. Return the mapped contract DTO.
 *
 * No calculations. No formatting. No persistence.
 */
@Injectable()
export class ShiftInvoiceService {
  /**
   * Generate the shift-invoice contract in the requested format.
   *
   * @param businessId  Resolved from the caller's auth context.
   * @param invoiceId   The invoice to generate.
   * @param format      Target output format.
   */
  async generate(
    businessId: string,
    invoiceId: string,
    format: ShiftInvoiceFormat,
  ): Promise<ShiftInvoiceContractResult> {
    const biResult = await this.fetchBiResult(businessId, invoiceId);
    return this.dispatch(format, biResult);
  }

  // ─── Format dispatcher ──────────────────────────────────────────────────────

  private dispatch(
    format: ShiftInvoiceFormat,
    result: ShiftInvoiceBiResult,
  ): ShiftInvoiceContractResult {
    switch (format) {
      case 'pdf':
        return mapShiftInvoiceToPdf(result);

      case 'xlsx':
        throw new NotImplementedException('XLSX format contract is not yet implemented');

      case 'csv':
        throw new NotImplementedException('CSV format contract is not yet implemented');

      case 'html':
        throw new NotImplementedException('HTML format contract is not yet implemented');

      case 'json':
        throw new NotImplementedException('JSON format contract is not yet implemented');

      case 'xml':
        throw new NotImplementedException('XML format contract is not yet implemented');
    }
  }

  // ─── BI result fetcher (placeholder) ───────────────────────────────────────

  /**
   * Placeholder — will call BusinessIntelligenceService.getShiftInvoice() once
   * the BI endpoint is defined and the service is injected.
   *
   * Returns a structurally valid but empty result so the contract pipeline and
   * mapper can be developed and tested independently of the BI service.
   */
  private async fetchBiResult(
    businessId: string,
    invoiceId: string,
  ): Promise<ShiftInvoiceBiResult> {
    // TODO: replace with: return this.bi.getShiftInvoice({ businessId, invoiceId });
    return buildPlaceholderBiResult(businessId, invoiceId);
  }
}

// ─── Placeholder factory ──────────────────────────────────────────────────────

function buildPlaceholderBiResult(
  businessId: string,
  invoiceId: string,
): ShiftInvoiceBiResult {
  return {
    company: {
      businessId,
      companyName: '',
      abn:         null,
      address:     null,
      email:       null,
      phone:       null,
    },
    customer: {
      customerId:   '',
      customerName: '',
      email:        null,
      phone:        null,
      address:      null,
    },
    invoice: {
      invoiceId,
      invoiceNumber: '',
      invoiceDate:   new Date().toISOString().slice(0, 10),
      dueDate:       null,
      currency:      'AUD',
      status:        'draft',
      contractId:    null,
      contractTitle: null,
    },
    workedHours: [],
    totals: {
      subtotal:  '0',
      taxRate:   null,
      taxAmount: '0',
      total:     '0',
      chargeGst: false,
      currency:  'AUD',
    },
    paymentInformation: {
      bankName:         null,
      accountName:      null,
      bsb:              null,
      accountNumber:    null,
      paymentReference: null,
      paymentTermsDays: null,
      paymentDueDate:   null,
    },
    notes: {
      invoiceNotes: null,
      paymentNotes: null,
      terms:        null,
    },
    metadata: {
      generatedAt:     new Date().toISOString(),
      contractVersion: null,
      source:          'placeholder',
    },
  };
}
