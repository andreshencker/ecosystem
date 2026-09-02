export type RelayEventType = 'notification' | 'alert' | 'request' | 'security';
export type RelayEventScope = 'platform' | 'company';

export interface EmailFilesResponseDto {
  required: string[];
  optional: string[];
}

export interface EmailChannelContentResponseDto {
  enabled: boolean;
  subject: string;
  content: string;
  requiredVariables: string[];
  optionalVariables: string[];
  files: EmailFilesResponseDto;
}

export interface SmsChannelContentResponseDto {
  enabled: boolean;
  content: string;
  requiredVariables: string[];
  optionalVariables: string[];
}

export interface ChannelContentResponseDto {
  email?: EmailChannelContentResponseDto;
  sms?: SmsChannelContentResponseDto;
}

export interface DomainSummaryResponseDto {
  companyId: string;
  domainKey: string;
  displayName: string;
  domainCategory: string;
  isActive: boolean;
}

export interface RelayEventResponseDto {
  id: string;
  /** String ID or populated domain object. */
  domainCatalogueId: string | DomainSummaryResponseDto;
  eventKey: string;
  displayName: string;
  description: string;
  eventType: RelayEventType;
  channelContent: ChannelContentResponseDto;
  isActive: boolean;
  scope: RelayEventScope;
  senderScope: RelayEventScope;
  createdAt: string;
  updatedAt: string;
}

export interface RelayEventListResponseDto {
  data: RelayEventResponseDto[];
  total: number;
  limit: number;
  offset: number;
}
