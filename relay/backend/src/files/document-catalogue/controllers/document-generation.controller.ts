// src/files/document-catalogue/controllers/document-generation.controller.ts
//
// Contract-driven generation endpoint.
// Route: POST /files/documents/generate
//
// This is the preferred generation path when a saved document contract exists.
// The caller sends only companyId, canonicalKey, filename and the runtime data values.
// The backend resolves the contract, validates the data and invokes the correct renderer.

import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RelayApiKeyGuard } from '../../../communication/common/guards/relay-api-key.guard';
import { DocumentGenerationService } from '../services/document-generation.service';
import { GenerateFromContractDto } from '../dto/generate-from-contract.dto';

@UseGuards(RelayApiKeyGuard)
@Controller('files/documents')
export class DocumentGenerationController {
  constructor(private readonly service: DocumentGenerationService) {}

  /**
   * Contract-driven file generation.
   *
   * POST /files/documents/generate
   *
   * Body:
   * {
   *   "companyId":    "<mongo-id>",
   *   "canonicalKey": "invoices.customer-invoice.pdf",
   *   "filename":     "invoice-INV-0001",
   *   "data": {
   *     "invoice":   { "invoiceNumber": "INV-0001", ... },
   *     "lineItems": [ { "date": "...", "amount": 1600 }, ... ],
   *     "totals":    { "subtotal": 2800, "gst": 280, "total": 3080 }
   *   }
   * }
   *
   * Response: binary file with Content-Disposition attachment header.
   *
   * Errors:
   *   400  — canonicalKey malformed, format not allowed, contract disabled
   *   404  — domain or document not found
   *   422  — runtime data does not satisfy the contract field requirements
   *   500  — renderer / generation failure
   */
  @Post('generate')
  async generate(@Body() dto: GenerateFromContractDto, @Res() res: Response) {
    const result = await this.service.generateFromContract({
      companyId: dto.companyId,
      canonicalKey: dto.canonicalKey,
      filename: dto.filename,
      data: dto.data ?? {},
      skipDataValidation: dto.skipDataValidation === true,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    return res.send(result.buffer);
  }
}
