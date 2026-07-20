import { Test } from '@nestjs/testing';
import { MdmService } from '../mdm.service';

describe('MdmService', () => {
  let service: MdmService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MdmService],
    }).compile();
    service = module.get<MdmService>(MdmService);
  });

  describe('getCurrencies', () => {
    it('returns at least AUD, USD, EUR, GBP', () => {
      const codes = service.getCurrencies().map((c) => c.code);
      expect(codes).toEqual(
        expect.arrayContaining(['AUD', 'USD', 'EUR', 'GBP']),
      );
    });
    it('AUD has decimals=2', () => {
      const aud = service.getCurrencies().find((c) => c.code === 'AUD');
      expect(aud?.decimals).toBe(2);
    });
  });

  describe('getTaxRates', () => {
    it('returns AU rates when jurisdiction=AU', () => {
      const rates = service.getTaxRates('AU');
      expect(
        rates.every((r) => r.jurisdiction === 'AU' || r.jurisdiction === '*'),
      ).toBe(true);
    });
    it('includes AU_GST at 10%', () => {
      const gst = service.getTaxRates('AU').find((r) => r.code === 'AU_GST');
      expect(gst?.rate).toBe(10);
    });
    it('returns all rates when no jurisdiction filter', () => {
      expect(service.getTaxRates().length).toBeGreaterThan(0);
    });
  });

  describe('getInvoiceStatuses', () => {
    it('includes draft, sent, paid, void', () => {
      const codes = service.getInvoiceStatuses().map((s) => s.code);
      expect(codes).toEqual(
        expect.arrayContaining(['draft', 'sent', 'paid', 'void']),
      );
    });
    it('paid and void are terminal', () => {
      const statuses = service.getInvoiceStatuses();
      expect(statuses.find((s) => s.code === 'paid')?.terminal).toBe(true);
      expect(statuses.find((s) => s.code === 'void')?.terminal).toBe(true);
    });
    it('draft is not terminal', () => {
      expect(
        service.getInvoiceStatuses().find((s) => s.code === 'draft')?.terminal,
      ).toBe(false);
    });
  });

  describe('getPaymentMethods', () => {
    it('includes bank_transfer and credit_card', () => {
      const codes = service.getPaymentMethods().map((m) => m.code);
      expect(codes).toEqual(
        expect.arrayContaining(['bank_transfer', 'credit_card']),
      );
    });
  });

  describe('getBillingCycles', () => {
    it('includes weekly, monthly, annually', () => {
      const codes = service.getBillingCycles().map((b) => b.code);
      expect(codes).toEqual(
        expect.arrayContaining(['weekly', 'monthly', 'annually']),
      );
    });
    it('monthly has daysApprox=30', () => {
      const monthly = service
        .getBillingCycles()
        .find((b) => b.code === 'monthly');
      expect(monthly?.daysApprox).toBe(30);
    });
  });
});
