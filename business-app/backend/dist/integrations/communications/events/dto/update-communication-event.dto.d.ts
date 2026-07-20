export declare class UpdateCommunicationEventDto {
    displayName?: string;
    description?: string;
    eventType?: 'notification' | 'alert' | 'request' | 'security';
    channelContent?: Record<string, any>;
    isActive?: boolean;
}
