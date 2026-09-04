import { computeCommercialReadiness, isSignalProduct, REQUIRED_COMMERCIAL_STEPS } from './commercial-readiness';

const BOT_TYPE = { key: 'bots', name: 'Bot' };
const SIGNAL_TYPE = { key: 'signals', name: 'Signal' };

const baseProduct = {
  name: 'My product',
  key: 'my-product',
  shortDescription: 'Short description',
  category: 'trend-following',
  platformIds: [{ _id: 'p1', name: 'MT5' }],
  presentation: {
    fullDescription: 'Full description',
    whatYouReceive: 'Signals',
    features: ['Feature one'],
  },
};

const activePricing = [{ status: 'active', isDefault: true, promotion: null }];

describe('isSignalProduct', () => {
  it('is true only for a populated TypeProduct with key "signals"', () => {
    expect(isSignalProduct(SIGNAL_TYPE)).toBe(true);
    expect(isSignalProduct(BOT_TYPE)).toBe(false);
  });

  it('is false for an un-populated ObjectId/string (no .key) — never guesses by name or id', () => {
    expect(isSignalProduct('64f0000000000000000000aa')).toBe(false);
    expect(isSignalProduct({ toString: () => '64f0000000000000000000aa' })).toBe(false);
    expect(isSignalProduct(null)).toBe(false);
    expect(isSignalProduct(undefined)).toBe(false);
  });

  it('never matches on display name alone', () => {
    expect(isSignalProduct({ key: 'bots', name: 'Signal' })).toBe(false);
  });
});

describe('computeCommercialReadiness — Bot (non-Signal) product', () => {
  it('has no Alert Setup requirement; Review is step 8 (the last step)', () => {
    const readiness = computeCommercialReadiness({
      product: { ...baseProduct, typeProductId: BOT_TYPE, indicatorIds: [] },
      pricingOptions: activePricing,
    });

    expect(readiness.steps.alertSetup.optional).toBe(true);
    expect(readiness.steps.alertSetup.complete).toBe(true);
    expect(readiness.steps.review.step).toBe(8);
    expect(readiness.percentage).toBe(100);
    expect(readiness.ready).toBe(true);
    // alertSetup must never be counted for a non-Signal product.
    expect(REQUIRED_COMMERCIAL_STEPS).not.toContain('alertSetup');
  });
});

describe('computeCommercialReadiness — Signal product: Alert Setup rule', () => {
  it('Review is step 9 — always the last step, after Alert Setup (step 8)', () => {
    const readiness = computeCommercialReadiness({
      product: { ...baseProduct, typeProductId: SIGNAL_TYPE, indicatorIds: [] },
      pricingOptions: activePricing,
    });
    expect(readiness.steps.alertSetup.step).toBe(8);
    expect(readiness.steps.review.step).toBe(9);
    expect(readiness.steps.review.step).toBeGreaterThan(readiness.steps.alertSetup.step);
  });

  it('zero indicators -> Alert Setup incomplete, overall not ready', () => {
    const readiness = computeCommercialReadiness({
      product: { ...baseProduct, typeProductId: SIGNAL_TYPE, indicatorIds: [] },
      pricingOptions: activePricing,
    });
    expect(readiness.steps.alertSetup.complete).toBe(false);
    expect(readiness.steps.alertSetup.missing).toEqual(['at least one indicator']);
    expect(readiness.ready).toBe(false);
  });

  it('one indicator with zero enabled alerts -> incomplete, with a named missing requirement', () => {
    const readiness = computeCommercialReadiness({
      product: {
        ...baseProduct,
        typeProductId: SIGNAL_TYPE,
        indicatorIds: [{ name: 'Momentum Indicator', pairs: [] }],
      },
      pricingOptions: activePricing,
    });
    expect(readiness.steps.alertSetup.complete).toBe(false);
    expect(readiness.steps.alertSetup.missing).toEqual([
      'Momentum Indicator requires at least one enabled alert',
    ]);
  });

  it('multiple indicators where one has no enabled alerts -> incomplete (names the offending one only)', () => {
    const readiness = computeCommercialReadiness({
      product: {
        ...baseProduct,
        typeProductId: SIGNAL_TYPE,
        indicatorIds: [
          { name: 'Blade Indicator', pairs: [{ enabled: true }] },
          { name: 'Momentum Indicator', pairs: [{ enabled: false }] },
        ],
      },
      pricingOptions: activePricing,
    });
    expect(readiness.steps.alertSetup.complete).toBe(false);
    expect(readiness.steps.alertSetup.missing).toEqual([
      'Momentum Indicator requires at least one enabled alert',
    ]);
  });

  it('every selected indicator has >=1 enabled alert -> Alert Setup complete, product ready', () => {
    const readiness = computeCommercialReadiness({
      product: {
        ...baseProduct,
        typeProductId: SIGNAL_TYPE,
        indicatorIds: [
          { name: 'Blade Indicator', pairs: [{ enabled: false }, { enabled: true }] },
          { name: 'Momentum Indicator', pairs: [{ enabled: true }] },
        ],
      },
      pricingOptions: activePricing,
    });
    expect(readiness.steps.alertSetup.complete).toBe(true);
    expect(readiness.steps.alertSetup.missing).toEqual([]);
    expect(readiness.ready).toBe(true);
    // percentage is now over 6 required steps (the 5 common + alertSetup).
    expect(readiness.percentage).toBe(100);
  });

  it('percentage denominator includes alertSetup only for Signal products', () => {
    const incomplete = computeCommercialReadiness({
      product: { ...baseProduct, typeProductId: SIGNAL_TYPE, indicatorIds: [] },
      pricingOptions: activePricing,
    });
    // 5 of 6 required steps complete (identity/presentation/classification/platforms/pricing),
    // alertSetup missing -> 5/6 rounded.
    expect(incomplete.percentage).toBe(Math.round((5 / 6) * 100));
  });
});
