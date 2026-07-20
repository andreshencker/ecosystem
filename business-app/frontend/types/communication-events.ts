export type CommunicationEventType = 'notification' | 'alert' | 'request' | 'security';
export type CommunicationEventScope = 'platform' | 'company';

export interface EmailFilesContent {
  required: string[];
  optional: string[];
}

export interface EmailChannelContent {
  enabled: boolean;
  subject?: string;
  content?: string;
  requiredVariables?: string[];
  optionalVariables?: string[];
  files?: EmailFilesContent;
}

export interface SmsChannelContent {
  enabled: boolean;
  content?: string;
  requiredVariables?: string[];
  optionalVariables?: string[];
}

export interface ChannelContent {
  email?: EmailChannelContent;
  sms?: SmsChannelContent;
}

export interface DomainCatalogueSummary {
  companyId: string;
  domainKey: string;
  displayName: string;
  domainCategory: string;
  isActive: boolean;
}

export interface CommunicationEvent {
  id: string;
  /** String ID or populated domain object (populated when listing). */
  domainCatalogueId: string | DomainCatalogueSummary;
  eventKey: string;
  displayName: string;
  description: string;
  eventType: CommunicationEventType;
  channelContent: ChannelContent;
  isActive: boolean;
  scope: CommunicationEventScope;
  senderScope: CommunicationEventScope;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationEventListResponse {
  data: CommunicationEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateEventPayload {
  domainCatalogueId: string;
  eventKey: string;
  displayName: string;
  description?: string;
  eventType: CommunicationEventType;
  channelContent?: ChannelContent;
  isActive?: boolean;
}

export interface UpdateEventPayload {
  displayName?: string;
  description?: string;
  eventType?: CommunicationEventType;
  channelContent?: ChannelContent;
  isActive?: boolean;
}

export interface BulkImportEventsPayload {
  domainCatalogueId: string;
  items: Array<{
    eventKey: string;
    displayName: string;
    eventType: CommunicationEventType;
    description?: string;
    channelContent?: ChannelContent;
    isActive?: boolean;
  }>;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const EVENT_TYPE_OPTIONS: { value: CommunicationEventType; label: string }[] = [
  { value: 'notification', label: 'Notification' },
  { value: 'alert',        label: 'Alert' },
  { value: 'request',      label: 'Request' },
  { value: 'security',     label: 'Security' },
];

export type ChannelStatus = 'configured' | 'missing' | 'disabled';

export function getEmailStatus(email: EmailChannelContent | undefined): ChannelStatus {
  if (!email || !email.enabled) return 'disabled';
  if (email.subject?.trim() && email.content?.trim()) return 'configured';
  return 'missing';
}

export function getSmsStatus(sms: SmsChannelContent | undefined): ChannelStatus {
  if (!sms || !sms.enabled) return 'disabled';
  if (sms.content?.trim()) return 'configured';
  return 'missing';
}

/** Resolve domain display name from an event's domainCatalogueId field. */
export function getDomainDisplayName(domainCatalogueId: CommunicationEvent['domainCatalogueId']): string {
  if (typeof domainCatalogueId === 'object' && domainCatalogueId !== null) {
    return (domainCatalogueId as DomainCatalogueSummary).displayName;
  }
  return '';
}
