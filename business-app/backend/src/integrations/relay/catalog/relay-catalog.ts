import type { UnifiedCatalog } from './relay-catalog.types';
import { PLATFORM_SEED_DOMAINS } from '../seed/platform-seed';

/**
 * RELAY_CATALOG — single source of truth for all communicable events.
 *
 * platform: driven by PLATFORM_SEED_DOMAINS — one *.seed.ts file per module.
 *           To add a new platform domain, create the seed file and register it
 *           in seed/platform-seed.ts. No changes here are ever needed.
 *           Provisioned at Business App startup (onApplicationBootstrap).
 *
 * business: events owned by tenant Businesses, delivered via each Business's own credentials.
 *           Provisioned when a Business saves its integration token.
 *
 * RULES:
 *   - One catalog. No parallel catalogs, no per-module catalogs.
 *   - eventKey = bare key (e.g. 'company_verify_email') — domainKey prefix NOT included.
 *   - canonicalKey = domainKey.eventKey (e.g. 'security.company_verify_email').
 *   - eventKey once published cannot be renamed.
 *   - sms/push entries are defined but disabled until explicitly needed.
 */
export const RELAY_CATALOG: UnifiedCatalog = {
  version: 1,

  // ─────────────────────────────────────────────────────────────────────────────
  //  PLATFORM — aggregated from seed/platform-seed.ts
  //  Add new domains there; no changes needed here.
  // ─────────────────────────────────────────────────────────────────────────────
  platform: PLATFORM_SEED_DOMAINS,

  // ─────────────────────────────────────────────────────────────────────────────
  //  BUSINESS — tenant events, delivered via each Business's own credentials.
  //  Provisioned when a Business saves its integration token.
  // ─────────────────────────────────────────────────────────────────────────────
  business: [
    // billing domain will be added in the Billing sprint.
    // {
    //   domainKey:      'billing',
    //   displayName:    'Billing',
    //   domainCategory: 'business_events',
    //   isSystem:       false,
    //   version:        1,
    //   events: [
    //     { eventKey: 'invoice_sent', ... },
    //     { eventKey: 'invoice_overdue', ... },
    //     { eventKey: 'payment_received', ... },
    //   ],
    // },
  ],
};

/**
 * Lookup helper: find a catalog event by canonical key (domainKey.eventKey).
 * Returns undefined if the key does not exist in either section.
 */
export function findCatalogEvent(canonicalKey: string):
  | {
      section: 'platform' | 'business';
      domain: string;
      event: import('./relay-catalog.types').CatalogEvent;
    }
  | undefined {
  const [domainKey, eventKey] = canonicalKey.split('.');
  if (!domainKey || !eventKey) return undefined;

  for (const section of ['platform', 'business'] as const) {
    const domain = RELAY_CATALOG[section].find(
      (d) => d.domainKey === domainKey,
    );
    if (!domain) continue;
    const event = domain.events.find((e) => e.eventKey === eventKey);
    if (event) return { section, domain: domainKey, event };
  }
  return undefined;
}
