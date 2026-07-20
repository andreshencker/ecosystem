export type ProviderCredentialChannel = "email" | "sms";

export type ProviderCredential = {
    id: string;
    companyChannelProviderId: string;
    tag?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;

    providerKey?: string;
    providerDisplayName?: string;
    channelKey?: string;
    channelDisplayName?: string;
};

export type ProviderCredentialOption = {
    id: string;
    label: string;

    channel: ProviderCredentialChannel;
    channelKey?: string;
    channelDisplayName?: string;

    providerKey?: string;
    providerDisplayName?: string;
    connectionType?: string;

    tag?: string;
    isActive?: boolean;

    companyChannelProviderId?: string;
};

export type CreateProviderCredentialsDto = {
    companyChannelProviderId: string;
    tag: string;
    credentials: Record<string, any>;
    isActive?: boolean;
};

export type UpdateProviderCredentialsDto = Partial<{
    tag: string;
    credentials: Record<string, any>;
    isActive: boolean;
}>;