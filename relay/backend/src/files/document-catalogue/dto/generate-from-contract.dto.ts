// src/files/document-catalogue/dto/generate-from-contract.dto.ts

import { IsMongoId, IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateFromContractDto {
  /** Company ID — used to resolve the domain and document contract. */
  @IsMongoId()
  companyId!: string;

  /**
   * Canonical key in the format "domainKey.documentKey.format".
   * e.g. "invoices.customer-invoice.pdf"
   */
  @IsString()
  canonicalKey!: string;

  /**
   * Output filename (extension is appended automatically).
   * e.g. "invoice-INV-0001"
   */
  @IsString()
  filename!: string;

  /**
   * Runtime values for this document.
   * The contract defines the structure; this object provides only the values.
   *
   * Example for a PDF invoice:
   * {
   *   "invoice": { "invoiceNumber": "INV-0001", "issueDate": "2026-07-22", ... },
   *   "lineItems": [ { "date": "...", "description": "...", "amount": 1600 }, ... ],
   *   "totals":    { "subtotal": 2800, "gst": 280, "total": 3080 },
   *   "payment":   ["Bank: ...", "BSB: ...", "Reference: INV-0001"]
   * }
   */
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  /**
   * When true, skips runtime data validation and generates the file anyway.
   * Use only during development to test layouts with incomplete data.
   * Default: false.
   */
  @IsOptional()
  skipDataValidation?: boolean;
}
