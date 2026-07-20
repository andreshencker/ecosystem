export type TypeProject = {
    id: string;
    key: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateTypeProjectDto = {
    key: string;
    name: string;
    description?: string;
    isActive?: boolean;
};

export type UpdateTypeProjectDto = Partial<CreateTypeProjectDto>;

export type TypeProjectsFiltersValue = {
    search: string;
    isActive: boolean | null;
};