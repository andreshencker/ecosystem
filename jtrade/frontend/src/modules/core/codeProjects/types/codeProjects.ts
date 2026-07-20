export type CodeProjectStatus =
    | "draft"
    | "published"
    | "suspended"
    | "archived";

export type CodeProject = {
    id: string;

    companyProviderId: string;
    typeProjectId: string;

    projectKey: string;
    name: string;
    description?: string;

    status: CodeProjectStatus;
    isActive: boolean;

    createdAt?: string;
    updatedAt?: string;

    companyProvider?: {
        id: string;
        companyName: string;
    };

    typeProject?: {
        id: string;
        key: string;
        name: string;
    };
};

export type ListCodeProjectsParams = {
    active?: boolean;
    companyProviderId?: string;
    typeProjectId?: string;
};

export type CreateCodeProjectPayload = {
    typeProjectId: string;
    projectKey: string;
    name: string;
    description?: string;
    isActive?: boolean;
};

export type UpdateCodeProjectPayload = Partial<{
    typeProjectId: string;
    projectKey: string;
    name: string;
    description: string;
    status: CodeProjectStatus;
    isActive: boolean;
}>;