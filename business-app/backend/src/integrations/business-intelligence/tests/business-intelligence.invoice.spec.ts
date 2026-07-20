import { Test } from '@nestjs/testing';

import { BusinessIntelligenceService } from '../business-intelligence.service';
import { BIHttpClient } from '../client/bi-http-client';
import { BIUnavailableError } from '../errors/bi-unavailable.error';
import type { InvoiceSummaryResult } from '../dto/responses/invoice-summary.dto';

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
};

describe('BusinessIntelligenceService — invoice methods', () => {
  let service: BusinessIntelligenceService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BusinessIntelligenceService,
        { provide: BIHttpClient, useValue: mockClient },
      ],
    }).compile();
    service = module.get(BusinessIntelligenceService);
    jest.clearAllMocks();
  });

  describe('getInvoiceSummary', () => {
    it('returns data on success', async () => {
      const mockResponse: InvoiceSummaryResult = {
        contract: 'invoice-summary',
        version: '1.0',
        scope: {
          companyId: 'c1',
          dateFrom: null,
          dateTo: null,
          currency: 'AUD',
          customerId: null,
        },
        generatedAt: new Date().toISOString(),
        summary: {
          invoiceCount: 2,
          totalInvoiced: '500.00',
          totalSubtotal: '450.00',
          totalTax: '50.00',
          averageInvoiceValue: '250.00',
          averageDaysToPayment: '30.00',
        },
        statusBreakdown: [],
        metadata: {
          source: 'postgresql',
          lastSyncedAt: null,
          currencyGroupingApplied: false,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);
      const result = await service.getInvoiceSummary({ businessId: 'c1' });
      expect(result).toEqual(mockResponse);
      expect(mockClient.get).toHaveBeenCalledWith(
        '/internal/invoices/summary',
        { businessId: 'c1' },
      );
    });

    it('returns null on BIUnavailableError', async () => {
      mockClient.get.mockRejectedValue(new BIUnavailableError('down'));
      const result = await service.getInvoiceSummary({ businessId: 'c1' });
      expect(result).toBeNull();
    });

    it('includes optional params when provided', async () => {
      mockClient.get.mockResolvedValue({} as InvoiceSummaryResult);
      await service.getInvoiceSummary({
        businessId: 'c1',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        currency: 'USD',
        customerId: 'cust-1',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/internal/invoices/summary',
        {
          businessId: 'c1',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
          currency: 'USD',
          customerId: 'cust-1',
        },
      );
    });
  });

  describe('syncInvoices', () => {
    it('posts to /internal/sync/invoices', async () => {
      mockClient.post.mockResolvedValue({
        model_name: 'invoice',
        company_id: 'c1',
        extracted: 5,
        transformed: 5,
        inserted: 3,
        updated: 2,
        failed: 0,
        duration_ms: 120,
        errors: [],
      });
      const result = await service.syncInvoices('c1');
      expect(result?.extracted).toBe(5);
      expect(mockClient.post).toHaveBeenCalledWith(
        '/internal/sync/invoices',
        { companyId: 'c1', full: false },
      );
    });

    it('returns null on BIUnavailableError', async () => {
      mockClient.post.mockRejectedValue(new BIUnavailableError('timeout'));
      const result = await service.syncInvoices('c1');
      expect(result).toBeNull();
    });
  });

  describe('syncModel', () => {
    it('posts to /internal/sync/{model}', async () => {
      mockClient.post.mockResolvedValue({
        model_name: 'shift',
        company_id: 'c1',
        extracted: 1,
        transformed: 1,
        inserted: 1,
        updated: 0,
        failed: 0,
        duration_ms: 10,
        errors: [],
      });
      const result = await service.syncModel('c1', 'shift', true);
      expect(result.model_name).toBe('shift');
      expect(mockClient.post).toHaveBeenCalledWith('/internal/sync/shift', {
        companyId: 'c1',
        full: true,
      });
    });
  });

  describe('query', () => {
    it('delegates to BIHttpClient.post', async () => {
      const mockResult = {
        domain: 'invoices',
        rows: [{ total: '100.00' }],
        kpis: {},
        metadata: {
          businessId: 'c1',
          domain: 'invoices',
          generatedAt: '2026-07-12T00:00:00Z',
          rowCount: 1,
          measures: ['total'],
          kpis: [],
          groupBy: [],
        },
      };
      mockClient.post.mockResolvedValue(mockResult);
      const result = await service.query({
        businessId: 'c1',
        domain: 'invoices',
        measures: ['gross_amount'],
      });
      expect(result).toEqual(mockResult);
      expect(mockClient.post).toHaveBeenCalledWith(
        '/internal/query',
        expect.objectContaining({ businessId: 'c1', domain: 'invoices' }),
      );
    });
  });

  describe('getSemanticMetadata', () => {
    it('fetches index when no domain provided', async () => {
      mockClient.get.mockResolvedValue({
        domains: ['invoices'],
        detail: {},
      });
      const result = await service.getSemanticMetadata();
      expect(mockClient.get).toHaveBeenCalledWith('/internal/semantic');
      expect(result).toBeDefined();
    });

    it('fetches domain detail when domain provided', async () => {
      mockClient.get.mockResolvedValue({
        domain: 'invoices',
        dimensions: {},
        measures: {},
        kpis: {},
      });
      await service.getSemanticMetadata('invoices');
      expect(mockClient.get).toHaveBeenCalledWith(
        '/internal/semantic/invoices',
      );
    });
  });

  describe('getSyncStatus', () => {
    it('fetches sync status for a company', async () => {
      mockClient.get.mockResolvedValue({
        companyId: 'c1',
        models: [],
        availableModels: ['invoice'],
      });
      const result = await service.getSyncStatus('c1');
      expect(result.companyId).toBe('c1');
      expect(mockClient.get).toHaveBeenCalledWith(
        '/internal/sync/status/c1',
      );
    });
  });
});
