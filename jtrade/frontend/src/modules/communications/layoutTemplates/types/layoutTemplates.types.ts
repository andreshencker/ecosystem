export type TemplateType = "email" | "pdf";

export type LayoutTemplate = {
    id: string;
    companyThemeId: string;

    templateType: TemplateType;
    key: string;
    name: string;

    html: string;
    css: string;

    requiredVariables: string[];
    optionalVariables: string[];

    isDefault: boolean;
    isActive: boolean;

    createdAt: string;
    updatedAt: string;
};

export type CreateLayoutTemplateDto = {
    companyThemeId: string;
    templateType: TemplateType;
    key: string;
    name: string;
    html: string;
    css?: string;
    requiredVariables?: string[];
    optionalVariables?: string[];
    isDefault?: boolean;
    isActive?: boolean;
};

export type UpdateLayoutTemplateDto = Partial<CreateLayoutTemplateDto>;

export type CompanyThemeOption = {
    id: string;
    label: string;
};