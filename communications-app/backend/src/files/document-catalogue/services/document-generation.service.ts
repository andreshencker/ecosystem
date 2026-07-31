// src/files/document-catalogue/services/document-generation.service.ts
//
// Contract-driven file generation.
//
// Flow:
//   1. Resolve the format contract via DocumentCatalogueService (canonicalKey)
//   2. Validate runtime data against the contract   (skippable for dev)
//   3. Build format-specific generator payload       (via format builders)
//   4. Call existing generator/renderer              (no new renderers added)
//   5. Return the download result

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DocumentCatalogueService } from '../document-catalogue.service';
import { GeneratorService } from '../../generator/generator.service';
import { ReportService } from '../../reports/report.service';
import { validateRuntimeData } from '../../generator/validators/runtime-data.validator';
import { buildPdfContent } from '../../generator/builders/pdf-content.builder';
import { buildXlsxContent } from '../../generator/builders/xlsx-content.builder';
import { buildCsvContent } from '../../generator/builders/csv-content.builder';
import type { DownloadFileResult } from '../../generator/dto/download-file.result';

export interface GenerateFromContractParams {
  companyId: string;
  canonicalKey: string;
  filename: string;
  data?: Record<string, any>;
  /** When true, skips runtime data validation. Useful during layout development. */
  skipDataValidation?: boolean;
}

@Injectable()
export class DocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  constructor(
    private readonly catalogueService: DocumentCatalogueService,
    private readonly generator: GeneratorService,
    private readonly reportService: ReportService,
  ) {}

  async generateFromContract(
    params: GenerateFromContractParams,
  ): Promise<DownloadFileResult> {
    const {
      companyId,
      canonicalKey,
      filename,
      skipDataValidation = false,
    } = params;
    const data = params.data ?? {};

    // ── 1. Resolve contract ────────────────────────────────────────────────────
    const resolved = await this.catalogueService.findByCompanyAndCanonicalKey(
      companyId,
      canonicalKey,
    );
    const { resolvedFormat: format, resolvedContract: contract } = resolved;

    // ── 2. Runtime data validation ─────────────────────────────────────────────
    if (!skipDataValidation) {
      const dataErrors = validateRuntimeData(format, contract, data);
      if (dataErrors.length > 0) {
        throw new HttpException(
          { message: 'Runtime data validation failed', errors: dataErrors },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    // ── 3. Build format payload + generate ─────────────────────────────────────
    try {
      switch (format) {
        case 'pdf':
          return await this.generatePdf(contract, data, companyId, filename);

        case 'xlsx':
          return await this.generateXlsx(contract, data, filename);

        case 'csv':
          return await this.generateCsv(contract, data, filename);

        default:
          throw new HttpException(
            `No generator available for format "${format}"`,
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      this.logger.error(
        `Generation failed for ${canonicalKey}: ${err?.message}`,
      );
      throw new HttpException(
        err?.message ?? 'File generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── PDF ──────────────────────────────────────────────────────────────────────

  private async generatePdf(
    contract: Record<string, any>,
    data: Record<string, any>,
    companyId: string,
    filename: string,
  ): Promise<DownloadFileResult> {
    const reportPayload = buildPdfContent(contract, data);

    // ReportService handles layout resolution from SourceOfTruthService
    return this.reportService.generatePdf({
      companyId,
      filename,
      report: reportPayload,
      data,
    });
  }

  // ─── XLSX ─────────────────────────────────────────────────────────────────────

  private async generateXlsx(
    contract: Record<string, any>,
    data: Record<string, any>,
    filename: string,
  ): Promise<DownloadFileResult> {
    const xlsxPayload = buildXlsxContent(contract, data);

    return this.generator.generate({
      format: 'xlsx',
      filename,
      payload: xlsxPayload,
    });
  }

  // ─── CSV ──────────────────────────────────────────────────────────────────────

  private async generateCsv(
    contract: Record<string, any>,
    data: Record<string, any>,
    filename: string,
  ): Promise<DownloadFileResult> {
    const csvPayload = buildCsvContent(contract, data);

    return this.generator.generate({
      format: 'csv',
      filename,
      payload: csvPayload,
    });
  }
}
