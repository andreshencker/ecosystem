export type CodeProjectVersionProjectCodePlatform = {
    id: string;
    deliveryMode: string;
    runtimeMode: string;
    status: string;
    isActive: boolean;
};

export type CodeProjectVersionCodeProject = {
    id: string;
    projectKey: string;
    name: string;
    status?: string;
    isActive: boolean;
};

export type CodeProjectVersionCompanyProvider = {
    id: string;
    companyName: string;
};

export type CodeProjectVersionPlatform = {
    id: string;
    name: string;
    category: string;
    connectionType: string;
    imageUrl?: string;
    isActive: boolean;
    isSupported: boolean;
};

export type CodeProjectVersion = {
    id: string;

    projectCodePlatformId: string;
    codeProjectId: string;
    companyProviderId: string;
    platformId: string;

    projectKey: string;

    version: string;
    fileName: string;
    originalFileName?: string;
    extension: string;
    fileKey: string;

    size: number;
    contentType: string;

    comments?: string;

    isCurrentVersion: boolean;
    isActive: boolean;

    projectCodePlatform?: CodeProjectVersionProjectCodePlatform;
    codeProject?: CodeProjectVersionCodeProject;
    companyProvider?: CodeProjectVersionCompanyProvider;
    platform?: CodeProjectVersionPlatform;

    createdAt?: string;
    updatedAt?: string;
};

export type ListCodeProjectVersionsParams = {
    projectCodePlatformId?: string;
    codeProjectId?: string;
    companyProviderId?: string;
    platformId?: string;
    active?: boolean;
    current?: boolean;
    populate?: boolean;
};

export type CreateCodeProjectVersionPayload = {
    projectCodePlatformId: string;
    version: string;
    comments?: string;
    isCurrentVersion?: boolean;
    isActive?: boolean;
};

export type UpdateCodeProjectVersionPayload = Partial<{
    projectCodePlatformId: string;
    version: string;
    comments: string;
    isCurrentVersion: boolean;
    isActive: boolean;
}>;

export type ReplaceCodeProjectVersionFilePayload = Partial<{
    projectCodePlatformId: string;
    version: string;
    comments: string;
    isCurrentVersion: boolean;
    isActive: boolean;
}>;

export type DownloadCurrentVersionPayload = {
    expiresInSeconds?: number;
};

export type CurrentVersionDownload = {
    projectCodePlatformId: string;
    projectKey: string;
    version: string;
    fileName: string;
    fileKey: string;
    downloadUrl: string;
    expiresInSeconds: number;
};

export type VersionDownload = {
    id: string;
    projectKey: string;
    version: string;
    fileName: string;
    fileKey: string;
    downloadUrl: string;
    expiresInSeconds: number;
};