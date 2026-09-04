/**
 * Commercial readiness = "is the PRODUCT ready to be sold" — identity,
 * presentation, classification, platforms, pricing, and (Signal products
 * only) alert setup. It is derived purely from real data (Product + its
 * ProductPricing options + its associated Indicators), never from the
 * wizard's stored step pointer. Backend is the single authority.
 *
 * This is NOT "marketplace-ready": that additionally needs a technically-ready
 * ProductVersion, which is a separate onboarding.
 */

import { SIGNALS_TYPE_KEY } from '../products/product-type-keys';

export type CommercialStepKey =
  | 'identity'
  | 'presentation'
  | 'classification'
  | 'platforms'
  | 'pricing'
  | 'promotions'
  | 'alertSetup'
  | 'review';

export interface CommercialStepReadiness {
  key: CommercialStepKey;
  /** Wizard step number. 'review' is dynamic: 8 for most types, 9 when Alert
   * Setup applies (Signal) — Review is always the LAST step. */
  step: number;
  label: string;
  /** Optional steps never block readiness. */
  optional: boolean;
  complete: boolean;
  /** Human-readable list of what is still missing for this step. */
  missing: string[];
}

export interface CommercialReadiness {
  /** All required steps (for this product's type) complete. */
  ready: boolean;
  /** 0..100 over the required steps for this product's type. */
  percentage: number;
  steps: Record<CommercialStepKey, CommercialStepReadiness>;
  /** Flattened missing requirements across required steps. */
  missing: string[];
}

/** The steps every product type must complete, regardless of kind. */
export const REQUIRED_COMMERCIAL_STEPS: CommercialStepKey[] = [
  'identity',
  'presentation',
  'classification',
  'platforms',
  'pricing',
];

/**
 * True when the product's chosen kind is the Signal type — resolved from the
 * real TypeProduct catalogue `key` (never its display name, never a
 * hardcoded Mongo id). `typeProductId` may arrive populated (has `.key`) or
 * as a bare ObjectId/string (not populated) — the latter never matches.
 */
export function isSignalProduct(typeProductId: unknown): boolean {
  if (
    typeProductId &&
    typeof typeProductId === 'object' &&
    'key' in (typeProductId as Record<string, unknown>)
  ) {
    return (typeProductId as { key?: unknown }).key === SIGNALS_TYPE_KEY;
  }
  return false;
}

interface ReadinessIndicator {
  name?: string | null;
  pairs?: Array<{ enabled?: boolean | null }> | null;
}

interface ReadinessInput {
  product: {
    name?: string | null;
    key?: string | null;
    shortDescription?: string | null;
    category?: string | null;
    typeProductId?: unknown; // populated object | ObjectId | null
    platformIds?: unknown[] | null; // populated objects | ObjectIds
    /** Populated Indicator docs (with their alert `pairs`) for Product.indicatorIds. */
    indicatorIds?: ReadinessIndicator[] | null;
    presentation?: {
      fullDescription?: string | null;
      whatYouReceive?: string | null;
      features?: string[] | null;
    } | null;
  };
  /** Raw-ish ProductPricing rows for the product (ProductPricingService.list output). */
  pricingOptions: Array<{
    status?: string;
    isDefault?: boolean;
    promotion?: unknown;
  }>;
}

const filled = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

function step(
  key: CommercialStepKey,
  n: number,
  label: string,
  optional: boolean,
  missing: string[],
): CommercialStepReadiness {
  return { key, step: n, label, optional, complete: missing.length === 0, missing };
}

export function computeCommercialReadiness(input: ReadinessInput): CommercialReadiness {
  const p = input.product ?? ({} as ReadinessInput['product']);
  const pres = p.presentation ?? {};
  const signal = isSignalProduct(p.typeProductId);

  // ── Identity ──
  const identityMissing: string[] = [];
  if (!filled(p.name)) identityMissing.push('name');
  if (!filled(p.key)) identityMissing.push('key');
  if (!filled(p.shortDescription)) identityMissing.push('short description');

  // ── Presentation ──
  const presentationMissing: string[] = [];
  if (!filled(pres.fullDescription)) presentationMissing.push('full description');
  if (!filled(pres.whatYouReceive)) presentationMissing.push('what the client receives');
  if (!Array.isArray(pres.features) || pres.features.filter(filled).length === 0) {
    presentationMissing.push('at least one feature');
  }

  // ── Classification ──
  const classificationMissing: string[] = [];
  if (!p.typeProductId) classificationMissing.push('product type');
  if (!filled(p.category)) classificationMissing.push('category');

  // ── Platforms ──
  const platformsMissing: string[] = [];
  if (!Array.isArray(p.platformIds) || p.platformIds.length === 0) {
    platformsMissing.push('at least one platform');
  }

  // ── Pricing ──
  const active = (input.pricingOptions ?? []).filter((o) => o?.status === 'active');
  const activeDefaults = active.filter((o) => o?.isDefault === true);
  const pricingMissing: string[] = [];
  if (active.length === 0) {
    pricingMissing.push('at least one active pricing option');
  } else if (activeDefaults.length !== 1) {
    pricingMissing.push('exactly one default pricing option');
  }

  // ── Promotions (optional) ──
  // Stored promotions are valid by construction (ProductPricingService validates
  // on write), so this step is always "complete". It just carries a note.
  const configuredPromotions = (input.pricingOptions ?? []).filter((o) => !!o?.promotion).length;
  const promotions: CommercialStepReadiness = {
    key: 'promotions',
    step: 7,
    label: 'Promotions',
    optional: true,
    complete: true,
    missing: [],
  };
  (promotions as CommercialStepReadiness & { configured?: number }).configured = configuredPromotions;

  // ── Alert Setup — Signal products only. Every indicator the provider
  //    associated with the product must have at least one ENABLED alert
  //    (Indicator.pairs[].enabled === true). Not required for other types —
  //    always reported as an optional/complete placeholder for those so the
  //    key exists uniformly in `steps`. ──
  const indicators = Array.isArray(p.indicatorIds) ? p.indicatorIds : [];
  const alertSetupMissing: string[] = [];
  if (signal) {
    if (indicators.length === 0) {
      alertSetupMissing.push('at least one indicator');
    } else {
      for (const indicator of indicators) {
        const pairs = Array.isArray(indicator?.pairs) ? indicator.pairs : [];
        const hasEnabledAlert = pairs.some((pair) => pair?.enabled === true);
        if (!hasEnabledAlert) {
          alertSetupMissing.push(`${indicator?.name || 'An indicator'} requires at least one enabled alert`);
        }
      }
    }
  }
  const alertSetup: CommercialStepReadiness = signal
    ? step('alertSetup', 8, 'Alert Setup', false, alertSetupMissing)
    : { key: 'alertSetup', step: 8, label: 'Alert Setup', optional: true, complete: true, missing: [] };

  // Review is always the LAST step: 9 when Alert Setup applies (Signal), else 8.
  const reviewStepNumber = signal ? 9 : 8;

  const steps: Record<CommercialStepKey, CommercialStepReadiness> = {
    identity: step('identity', 2, 'Product identity', false, identityMissing),
    presentation: step('presentation', 3, 'Product presentation', false, presentationMissing),
    platforms: step('platforms', 4, 'Platforms', false, platformsMissing),
    classification: step('classification', 5, 'Classification', false, classificationMissing),
    pricing: step('pricing', 6, 'Pricing', false, pricingMissing),
    promotions,
    alertSetup,
    review: step('review', reviewStepNumber, 'Review', false, []),
  };

  const required: CommercialStepKey[] = signal
    ? [...REQUIRED_COMMERCIAL_STEPS, 'alertSetup']
    : REQUIRED_COMMERCIAL_STEPS;

  const doneCount = required.filter((k) => steps[k].complete).length;
  const ready = doneCount === required.length;

  steps.review.complete = ready;
  steps.review.missing = ready
    ? []
    : required.filter((k) => !steps[k].complete).map((k) => steps[k].label);

  return {
    ready,
    percentage: Math.round((doneCount / required.length) * 100),
    steps,
    missing: required.flatMap((k) => steps[k].missing),
  };
}
