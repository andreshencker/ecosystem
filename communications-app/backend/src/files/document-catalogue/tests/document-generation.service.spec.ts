import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentGenerationService } from '../services/document-generation.service';
import { DocumentCatalogueService } from '../document-catalogue.service';
import { GeneratorService } from '../../generator/generator.service';
import { ReportService } from '../../reports/report.service';

const VALID_COMPANY_ID = '507f1f77bcf86cd799439033';

function makeResolved(format: string, contract: Record<string, any>) {
  return {
    id: '507f1f77bcf86cd799439011',
    documentDomainCatalogueId: new Types.ObjectId().toHexString(),
    documentKey: 'invoice_report',
    displayName: 'Invoice Report',
    description: '',
    formatContracts: { [format]: contract },
    isActive: true,
    createdAt: '',
    updatedAt: '',
    resolvedFormat: format,
    resolvedContract: contract,
  };
}

const PDF_CONTRACT = {
  enabled: true,
  version: '1.0',
  renderer: 'pdf',
  layoutType: 'pdf',
  sections: [
    {
      key: 'header',
      type: 'summary',
      enabled: true,
      dataPath: 'invoice',
      dataType: 'object',
      fields: [
        {
          key: 'invoiceNumber',
          label: 'Invoice No.',
          type: 'string',
          required: true,
        },
      ],
      columns: [],
    },
  ],
};

const XLSX_CONTRACT = {
  enabled: true,
  version: '1.0',
  renderer: 'xlsx',
  worksheets: [
    {
      key: 'items',
      label: 'Invoice Items',
      dataPath: 'lineItems',
      columns: [
        {
          key: 'description',
          label: 'Description',
          type: 'string',
          required: true,
        },
      ],
    },
  ],
};

const CSV_CONTRACT = {
  enabled: true,
  version: '1.0',
  renderer: 'csv',
  dataPath: 'lineItems',
  columns: [
    {
      key: 'description',
      label: 'Description',
      type: 'string',
      required: true,
    },
  ],
};

describe('DocumentGenerationService', () => {
  let service: DocumentGenerationService;
  let catalogueMock: { findByCompanyAndCanonicalKey: jest.Mock };
  let generatorMock: { generate: jest.Mock };
  let reportMock: { generatePdf: jest.Mock };

  beforeEach(async () => {
    catalogueMock = { findByCompanyAndCanonicalKey: jest.fn() };
    generatorMock = { generate: jest.fn() };
    reportMock = { generatePdf: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentGenerationService,
        { provide: DocumentCatalogueService, useValue: catalogueMock },
        { provide: GeneratorService, useValue: generatorMock },
        { provide: ReportService, useValue: reportMock },
      ],
    }).compile();

    service = module.get<DocumentGenerationService>(DocumentGenerationService);
  });

  // ─── PDF ─────────────────────────────────────────────────────────────────────

  describe('PDF generation', () => {
    it('calls ReportService.generatePdf with built payload', async () => {
      catalogueMock.findByCompanyAndCanonicalKey.mockResolvedValue(
        makeResolved('pdf', PDF_CONTRACT),
      );
      reportMock.generatePdf.mockResolvedValue({
        format: 'pdf',
        filename: 'invoice.pdf',
        buffer: Buffer.from('pdf'),
        mimeType: 'application/pdf',
      });

      const result = await service.generateFromContract({
        companyId: VALID_COMPANY_ID,
        canonicalKey: 'invoices.invoice_report.pdf',
        filename: 'invoice',
        data: { invoice: { invoiceNumber: 'INV-0001' } },
      });

      expect(reportMock.generatePdf).toHaveBeenCalledTimes(1);
      expect(result.format).toBe('pdf');
    });

    it('returns 422 when runtime data is invalid', async () => {
      catalogueMock.findByCompanyAndCanonicalKey.mockResolvedValue(
        makeResolved('pdf', PDF_CONTRACT),
      );

      await expect(
        service.generateFromContract({
          companyId: VALID_COMPANY_ID,
          canonicalKey: 'invoices.invoice_report.pdf',
          filename: 'invoice',
          data: {}, // invoice.invoiceNumber missing
        }),
      ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
    });

    it('skips data validation when skipDataValidation=true', async () => {
      catalogueMock.findByCompanyAndCanonicalKey.mockResolvedValue(
        makeResolved('pdf', PDF_CONTRACT),
      );
      reportMock.generatePdf.mockResolvedValue({
        format: 'pdf',
        filename: 'invoice.pdf',
        buffer: Buffer.from('pdf'),
        mimeType: 'application/pdf',
      });

      await expect(
        service.generateFromContract({
          companyId: VALID_COMPANY_ID,
          canonicalKey: 'invoices.invoice_report.pdf',
          filename: 'invoice',
          data: {}, // missing but skipped
          skipDataValidation: true,
        }),
      ).resolves.toBeDefined();
    });
  });

  // ─── XLSX ─────────────────────────────────────────────────────────────────────

  describe('XLSX generation', () => {
    it('calls GeneratorService.generate with built xlsx payload', async () => {
      catalogueMock.findByCompanyAndCanonicalKey.mockResolvedValue(
        makeResolved('xlsx', XLSX_CONTRACT),
      );
      generatorMock.generate.mockResolvedValue({
        format: 'xlsx',
        filename: 'invoice.xlsx',
        buffer: Buffer.from('xlsx'),
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await service.generateFromContract({
        companyId: VALID_COMPANY_ID,
        canonicalKey: 'invoices.invoice_report.xlsx',
        filename: 'invoice',
        data: { lineItems: [{ description: 'Consulting' }] },
      });

      expect(generatorMock.generate).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'xlsx' }),
      );
      expect(result.format).toBe('xlsx');
    });

    it('returns 422 when lineItems is missing', async () => {
      catalogueMock.findByCompanyAndCanonicalKey.mockResolvedValue(
        makeResolved('xlsx', XLSX_CONTRACT),
      );

      await expect(
        service.generateFromContract({
          companyId: VALID_COMPANY_ID,
          canonicalKey: 'invoices.invoice_report.xlsx',
          filename: 'invoice',
          data: {}, // lineItems missing
        }),
      ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
    });
  });

  // ─── CSV ──────────────────────────────────────────────────────────────────────

  describe('CSV generation', () => {
    it('calls GeneratorService.generate with built csv payload', async () => {
      catalogueMock.findByCompanyAndCanonicalKey.mockResolvedValue(
        makeResolved('csv', CSV_CONTRACT),
      );
      generatorMock.generate.mockResolvedValue({
        format: 'csv',
        filename: 'invoice.csv',
        buffer: Buffer.from('csv'),
        mimeType: 'text/csv; charset=utf-8',
      });

      const result = await service.generateFromContract({
        companyId: VALID_COMPANY_ID,
        canonicalKey: 'invoices.invoice_report.csv',
        filename: 'invoice',
        data: { lineItems: [{ description: 'Consulting' }] },
      });

      expect(generatorMock.generate).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'csv' }),
      );
      expect(result.format).toBe('csv');
    });
  });

  // ─── Error propagation ────────────────────────────────────────────────────────

  it('propagates 404 from catalogue resolution', async () => {
    catalogueMock.findByCompanyAndCanonicalKey.mockRejectedValue(
      new HttpException('Document not found', HttpStatus.NOT_FOUND),
    );

    await expect(
      service.generateFromContract({
        companyId: VALID_COMPANY_ID,
        canonicalKey: 'x.y.pdf',
        filename: 'f',
        data: {},
      }),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });
});
