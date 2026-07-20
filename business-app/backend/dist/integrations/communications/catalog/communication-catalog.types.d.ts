export type EventType = 'notification' | 'alert' | 'security';
export type CatalogChannel = 'email' | 'sms' | 'push';
export interface CatalogEventEmail {
    enabled: boolean;
    subject: string;
    content: string;
    requiredVariables: string[];
    optionalVariables: string[];
}
export interface CatalogEventSms {
    enabled: boolean;
    text?: string;
    requiredVariables: string[];
    optionalVariables: string[];
}
export interface CatalogEventPush {
    enabled: boolean;
    title?: string;
    body?: string;
    requiredVariables: string[];
    optionalVariables: string[];
}
export interface CatalogEventChannels {
    email?: CatalogEventEmail;
    sms?: CatalogEventSms;
    push?: CatalogEventPush;
}
export interface CatalogEvent {
    eventKey: string;
    displayName: string;
    description: string;
    eventType: EventType;
    channels: CatalogEventChannels;
}
export interface CatalogDomain {
    domainKey: string;
    displayName: string;
    domainCategory: string;
    isSystem: boolean;
    version: number;
    events: CatalogEvent[];
}
export interface UnifiedCatalog {
    version: number;
    platform: CatalogDomain[];
    business: CatalogDomain[];
}
