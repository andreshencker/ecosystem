export declare class CreateCommunicationEventDto {
    domainCatalogueId: string;
    eventKey: string;
    displayName: string;
    description?: string;
    eventType: 'notification' | 'alert' | 'request' | 'security';
    channelContent?: Record<string, any>;
    isActive?: boolean;
}
