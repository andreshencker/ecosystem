import type { UnifiedCatalog } from './communication-catalog.types';
export declare const COMMUNICATION_CATALOG: UnifiedCatalog;
export declare function findCatalogEvent(canonicalKey: string): {
    section: 'platform' | 'business';
    domain: string;
    event: import('./communication-catalog.types').CatalogEvent;
} | undefined;
