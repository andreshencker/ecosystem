export type AdminIndicator = {
    id: string;

    indicatorProjectId: string;

    webhookKey?: string;
    isActive: boolean;

    createdAt?: string;
    updatedAt?: string;

    indicatorProject?: {
        id: string;
        isActive?: boolean;
        notes?: string;

        indicator?: {
            id: string;
            name?: string;
            key?: string;
            description?: string;
            isActive?: boolean;
        };

        projectCodePlatform?: {
            id: string;
            deliveryMode?: string;
            runtimeMode?: string;
            status?: string;
            isActive?: boolean;

            codeProject?: {
                id: string;
                name?: string;
                projectKey?: string;
                isActive?: boolean;
            };

            platform?: {
                id: string;
                name?: string;
                category?: string;
                connectionType?: string;
                imageUrl?: string;
                isActive?: boolean;
                isSupported?: boolean;
            };
        };

        companyProvider?: {
            id: string;
            companyName?: string;
            status?: string;
            isVerified?: boolean;
            isActive?: boolean;
        };
    };
};

export type CreateAdminIndicatorPayload = {
    indicatorProjectId: string;
};

export type UpdateAdminIndicatorPayload = {
    isActive?: boolean;
};

export type WebhookKeyResponse = {
    webhookKey: string;
};

export type RevealWebhookResponse = {
    webhookKey: string;
    webhookSecret: string;
};

export type RotateWebhookResponse = {
    rotated: boolean;
    webhookKey: string;
};