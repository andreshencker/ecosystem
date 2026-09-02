import { ProductPricingService } from './product-pricing.service';

describe('ProductPricingService', () => {
  const service = new ProductPricingService({} as never, {} as never);

  it('calculates an active percentage promotion in minor units', () => {
    const result = service.present({
      amount: 29000,
      promotion: { type: 'percentage', value: 20, isActive: true, startsAt: null, endsAt: null },
    });
    expect(result.effectiveAmount).toBe(23200);
    expect(result.discountAmount).toBe(5800);
    expect(result.hasActivePromotion).toBe(true);
  });

  it('uses a direct promotional price', () => {
    const result = service.present({
      amount: 40000,
      promotion: { type: 'direct_price', value: 32000, isActive: true, startsAt: null, endsAt: null },
    });
    expect(result.effectiveAmount).toBe(32000);
    expect(result.discountAmount).toBe(8000);
  });

  it('ignores a scheduled promotion before its start date', () => {
    const result = service.present({
      amount: 10000,
      promotion: { type: 'fixed_amount', value: 2000, isActive: true, startsAt: new Date('2030-01-02'), endsAt: null },
    }, new Date('2030-01-01'));
    expect(result.effectiveAmount).toBe(10000);
    expect(result.hasActivePromotion).toBe(false);
  });
});
