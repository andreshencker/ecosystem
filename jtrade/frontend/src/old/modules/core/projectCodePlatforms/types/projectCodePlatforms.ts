export type ProjectCodePlatformStatus =
    | "draft"
    | "published"
    | "suspended"
    | "archived";

export type ProjectDeliveryMode =
    | "download"
    | "webhook"
    | "api"
    | "cloud"
    | "managed";

export type ProjectRuntimeMode =
    | "none"
    | "signal_based"
    | "bot_execution"
    | "copy_trading"
    | "strategy_rules";

export type ProjectCodePlatform = {
    id: string;

    codeProjectId: string;
    platformId: string;

    deliveryMode: ProjectDeliveryMode;
    runtimeMode: ProjectRuntimeMode;
    status: ProjectCodePlatformStatus;

    isActive: boolean;
    notes?: string;

    createdAt?: string;
    updatedAt?: string;

    codeProject?: {
        id: string;
        projectKey: string;
        name: string;
        companyProviderId?: string;
    };

    platform?: {
        id: string;
        name: string;
        category?: string;
        imageUrl?: string;
        isActive?: boolean;
        isSupported?: boolean;
        connectionType?: string;
    };
};

export type ListProjectCodePlatformsParams = {
    active?: boolean;
    codeProjectId?: string;
    platformId?: string;
};

export type CreateProjectCodePlatformPayload = {
    codeProjectId: string;
    platformId: string;
    deliveryMode?: ProjectDeliveryMode;
    runtimeMode?: ProjectRuntimeMode;
    isActive?: boolean;
    notes?: string;
};

export type UpdateProjectCodePlatformPayload = Partial<{
    platformId: string;
    deliveryMode: ProjectDeliveryMode;
    runtimeMode: ProjectRuntimeMode;
    status: ProjectCodePlatformStatus;
    isActive: boolean;
    notes: string;
}>;