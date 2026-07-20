/**
 * Discriminated union for notifyEvent().
 *
 * Platform events → Platform base Business credentials.
 * Business events → that Business's own CommunicationConnection.
 *
 * Communications App never receives the `type` field.
 * Credential resolution is entirely internal to CommunicationsClientService.
 */
export type NotifyEventParams = PlatformEventParams | BusinessEventParams;

interface BaseEventParams {
  /** Canonical event key — 'domainKey.eventKey'. */
  event: string;
  /** Recipient email address. */
  email: string;
  /** Template variables sent as payload.data. */
  data: Record<string, string | undefined | null>;
}

/**
 * Platform security / lifecycle event.
 * Uses the Platform base Business (isPlatformCompany: true) credentials.
 * businessId MUST NOT be provided — the platform connection is resolved
 * independently of any individual user's company.
 */
export interface PlatformEventParams extends BaseEventParams {
  type: 'platform';
}

/**
 * Business operational event.
 * Uses the identified Business's own CommunicationConnection.
 * businessId is required and must come from AuthContext — never from a request body.
 */
export interface BusinessEventParams extends BaseEventParams {
  type: 'business';
  /** Business App ObjectId string — identifies whose connection to use. */
  businessId: string;
}
