import type { CatalogDomain } from '../catalog/communication-catalog.types';
import { SECURITY_SEED_DOMAIN }          from './domains/security/security.seed';
import { CONTRACTS_SEED_DOMAIN }         from './domains/contracts/contracts.seed';
import { SHIFTS_SEED_DOMAIN }            from './domains/shifts/shifts.seed';
import { LINKED_CALENDARS_SEED_DOMAIN }  from './domains/linked-calendars/linked-calendars.seed';
import { CALENDAR_SYNC_SEED_DOMAIN }     from './domains/calendar-sync/calendar-sync.seed';

/**
 * PLATFORM_SEED_DOMAINS — ordered list of all platform catalog domains.
 *
 * HOW TO ADD A NEW PLATFORM MODULE:
 *   1. Create  src/integrations/communications/seed/domains/<module>/<module>.seed.ts
 *      and export a const <MODULE>_SEED_DOMAIN: CatalogDomain
 *   2. Import it here and append it to the array below.
 *   3. On next application startup provisionPlatformCatalog() will automatically
 *      create the domain and its events in Communications. Existing entries are
 *      never overwritten — the operation is idempotent.
 *
 * No changes to the provisioning service are ever needed.
 */
export const PLATFORM_SEED_DOMAINS: CatalogDomain[] = [
  SECURITY_SEED_DOMAIN,
  CONTRACTS_SEED_DOMAIN,
  SHIFTS_SEED_DOMAIN,
  LINKED_CALENDARS_SEED_DOMAIN,
  CALENDAR_SYNC_SEED_DOMAIN,
];
