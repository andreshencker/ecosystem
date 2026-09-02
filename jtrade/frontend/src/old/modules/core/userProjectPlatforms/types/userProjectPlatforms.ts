export type UserProjectPlatform = {
    id: string;

    userId: string;
    projectCodePlatformId: string;

    isActive: boolean;

    subscribedAt?: string;
    lastDownloadAt?: string | null;

    user?: {
        id: string;
        fullName?: string;
        email: string;
        role: string;
        avatarUrl?: string;
    };

    projectCodePlatform?: {
        id: string;
        deliveryMode?: string;
        runtimeMode?: string;
        status?: string;
        isActive: boolean;

        codeProject?: {
            id: string;
            projectKey: string;
            name: string;
            description?: string;
            isActive: boolean;

            typeProject?: {
                id: string;
                key: string;
                name: string;
                description?: string;
                isActive: boolean;
            };
        };

        platform?: {
            id: string;
            name: string;
            category?: string;
            connectionType?: string;
            imageUrl?: string;
            isActive: boolean;
            isSupported: boolean;
        };

        companyProvider?: {
            id: string;
            companyName: string;
            legalName?: string;
            logoUrl?: string;
            isActive?: boolean;
        };
    };

    createdAt?: string;
    updatedAt?: string;
};

export type CreateUserProjectPlatformDto = {
    projectCodePlatformId: string;
};

export type UpdateUserProjectPlatformDto = {
    isActive?: boolean;
};

export type ListUserProjectPlatformsParams = {
    userId?: string;
    projectCodePlatformId?: string;
    isActive?: boolean;
};