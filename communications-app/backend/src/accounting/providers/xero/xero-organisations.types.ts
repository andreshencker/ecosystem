// src/accounting/providers/xero/xero-organisations.types.ts
//
// Canonical response types for the Xero organisation management API.
//
// SECURITY — what is NOT in these types:
//   - tenantId (kept internal — external callers only see the Communications id)
//   - accessToken / refreshToken / clientSecret
//   - encrypted payloads
//   - raw Xero connection objects

/**
 * Safe canonical representation of a Xero organisation authorised through
 * one ProviderCredentials (OAuth connection).
 *
 * The `id` is the Communications-internal MongoDB ObjectId (_id of the
 * xero_organisations document).  External applications use this ID to select
 * an organisation for an Accounting operation without needing to know the
 * Xero tenant UUID.
 */
export interface XeroOrganisationResponse {
  /** Communications-internal organisation ID (MongoDB ObjectId string). */
  id: string;

  /** ProviderCredentials._id that authorised access to this organisation. */
  connectionId: string;

  providerKey: 'xero';

  /** Human-readable organisation name from Xero. Null when not yet known. */
  name: string | null;

  /** Xero tenant type, e.g. 'ORGANISATION'. */
  type: string;

  /**
   * Whether this organisation is currently available for Accounting operations.
   * 'available' → usable.
   * 'unavailable' → access was revoked in Xero or removed on last refresh.
   */
  status: 'available' | 'unavailable';

  /** True when this is the auto-selected organisation for the connection. */
  isDefault: boolean;

  /** ISO string when the org was first discovered. */
  discoveredAt: string;

  /** ISO string of the last successful Xero verification. Null if never verified. */
  lastVerifiedAt: string | null;
}

/**
 * Summary of authorised organisations for a connection.
 * Returned by the list endpoint.
 */
export interface XeroOrganisationsListResponse {
  connectionId: string;
  providerKey: 'xero';
  total: number;
  available: number;
  organisations: XeroOrganisationResponse[];
}

/**
 * Result of a refresh operation.
 */
export interface XeroOrganisationsRefreshResponse {
  connectionId: string;
  discovered: number;
  nowAvailable: number;
  nowUnavailable: number;
  message: string;
}

/**
 * Setup metadata for the Xero OAuth connection.
 * Returned to the frontend so the user knows what to register in their
 * Xero Developer application.
 */
export interface XeroSetupMetadata {
  providerKey: 'xero';
  channelKey: 'accounting';
  connectionType: 'oauth';
  /**
   * The callback URL that must be registered in the company's Xero Developer
   * application.  Generated from API_BASE_URL — never stored per-connection.
   */
  callbackUrl: string;
  requiresClientCredentials: boolean;
  supportsMultipleOrganisations: boolean;
  instructions: string[];
}
