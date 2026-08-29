export type PlatformLite = {
    id: string;
    name?: string;
    category?: string;
    connectionType?: string;
    imageUrl?: string;
    isActive?: boolean;
    isSupported?: boolean;
};

export type CodeProjectLite = {
    id: string;
    name?: string;
    projectKey?: string;
    isActive?: boolean;
};

export type ProjectCodePlatformLite = {
    id: string;
    deliveryMode?: string;
    runtimeMode?: string;
    status?: string;
    isActive?: boolean;
    codeProject?: CodeProjectLite | null;
    platform?: PlatformLite | null;
};

export type UserProjectPlatformLite = {
    id: string;
    userId?: string;
    projectCodePlatformId?: string;
    isActive?: boolean;
    subscribedAt?: string;
    lastDownloadAt?: string | null;
    projectCodePlatform?: ProjectCodePlatformLite | null;
};

export type IndicatorLite = {
    id: string;
    name?: string;
    key?: string;
    description?: string;
    isActive?: boolean;
};

export type CompanyProviderLite = {
    id: string;
    companyName?: string;
    status?: string;
    isVerified?: boolean;
    isActive?: boolean;
};

export type IndicatorProjectLite = {
    id: string;
    companyProviderId?: string;
    projectCodePlatformId?: string;
    indicatorId?: string;
    isActive?: boolean;
    notes?: string;
    indicator?: IndicatorLite | null;
    companyProvider?: CompanyProviderLite | null;
    projectCodePlatform?: ProjectCodePlatformLite | null;
};

export type UserAccountInfo = {
    id: string;
    userProjectPlatformId: string;
    indicatorProjectId: string;
    accountRef: string | null;
    accountLabel?: string | null;
    canTrade: boolean;

    useDrawdownLimit: boolean;
    useProfitLimit: boolean;
    maxDrawdownPercent: number;
    maxProfitPercent: number;

    isActive: boolean;
    userProjectPlatform?: UserProjectPlatformLite | null;
    indicatorProject?: IndicatorProjectLite | null;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateUserAccountInfoDto = {
    userProjectPlatformId: string;
    indicatorProjectId?: string;
    accountRef?: string | null;
    accountLabel?: string | null;
    canTrade: boolean;

    useDrawdownLimit?: boolean;
    useProfitLimit?: boolean;
    maxDrawdownPercent?: number;
    maxProfitPercent?: number;
};

export type UpdateUserAccountInfoDto = {
    accountRef?: string | null;
    accountLabel?: string | null;
    canTrade?: boolean;

    useDrawdownLimit?: boolean;
    useProfitLimit?: boolean;
    maxDrawdownPercent?: number;
    maxProfitPercent?: number;

    isActive?: boolean;
};

export type Option = {
    id: string;
    label: string;
    meta?: any;
};

export type UserProjectPlatformOption = Option & {
    imageUrl?: string;
    meta?: {
        projectName?: string;
        projectKey?: string;
        typeProjectKey?: string;
        typeProjectName?: string;
        platformName?: string;
        runtimeMode?: string;
        status?: string;
        isActive?: boolean;
    };
};

export type IndicatorProjectOption = Option & {
    meta?: {
        indicatorName?: string;
        indicatorKey?: string;
        projectName?: string;
        projectKey?: string;
        platformName?: string;
        runtimeMode?: string;
        isActive?: boolean;
    };
};