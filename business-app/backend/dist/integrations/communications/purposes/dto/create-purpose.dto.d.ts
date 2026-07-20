export declare class ChannelToUseInputDto {
    channel: 'email' | 'sms';
    providerCredentialsId: string;
}
export declare class CreatePurposeDto {
    domainKey: string;
    displayName: string;
    domainCategory: string;
    isActive?: boolean;
    channelsToUse?: ChannelToUseInputDto[];
}
