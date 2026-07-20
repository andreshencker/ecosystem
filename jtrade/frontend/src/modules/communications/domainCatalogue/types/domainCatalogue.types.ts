export type DomainChannel = "email" | "sms";

export type ChannelToUse = {
    channel: DomainChannel;
    providerCredentialsId: string;
};

export type DomainCatalogue = {
    id: string;
    companyId: string;
    domainKey: string;
    displayName: string;
    domainCategory: string;
    isActive: boolean;
    channelsToUse: ChannelToUse[];
    createdAt: string;
    updatedAt: string;
};

export type CreateDomainCatalogueDto = {
    companyId: string;
    domainKey: string;
    displayName: string;
    domainCategory: string;
    isActive?: boolean;
    channelsToUse?: ChannelToUse[];
};

export type UpdateDomainCatalogueDto = Partial<CreateDomainCatalogueDto>;

export type DomainCredentialsResponse = {
    domain: {
        id: string;
        companyId: string;
        domainKey: string;
        displayName: string;
        isActive: boolean;
    };
    channels: Array<{
        channel: DomainChannel;
        providerCredentialsId: string;
        tag?: string | null;
        credentialsIsActive?: boolean | null;
        providerKey?: string | null;
        providerDisplayName?: string | null;
        channelKey?: string | null;
        channelDisplayName?: string | null;
    }>;
};