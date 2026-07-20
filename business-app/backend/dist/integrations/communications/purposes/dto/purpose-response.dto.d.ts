export type PurposeChannel = 'email' | 'sms';
export interface ChannelToUseResponseDto {
    channel: PurposeChannel;
    providerCredentialsId: string;
}
export interface PurposeResponseDto {
    id: string;
    companyId: string;
    domainKey: string;
    displayName: string;
    domainCategory: string;
    isActive: boolean;
    isSystem: boolean;
    channelsToUse: ChannelToUseResponseDto[];
    createdAt: string;
    updatedAt: string;
}
export interface PurposeListResponseDto {
    data: PurposeResponseDto[];
    total: number;
    limit: number;
    offset: number;
}
export interface CredentialOptionDto {
    id: string;
    tag: string;
    displayIdentifier?: string;
    label: string;
    channel: string;
    channelDisplayName: string;
    providerKey: string;
    providerDisplayName: string;
    connectionType: string;
    isActive: boolean;
}
