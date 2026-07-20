export type CompanyTheme = {
    id: string;
    companyId: string;

    label: string;

    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedTextColor: string;
    borderColor: string;
    linkColor: string;

    fontFamily: string;
    fontSizeBase: string;
    fontWeightNormal: number;
    fontWeightBold: number;

    isDefault: boolean;
    isActive: boolean;

    createdAt: string;
    updatedAt: string;
};

export type CreateCompanyThemeDto = {
    companyId: string;
    label: string;

    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedTextColor: string;
    borderColor: string;
    linkColor: string;

    fontFamily: string;
    fontSizeBase: string;
    fontWeightNormal: number;
    fontWeightBold: number;

    isDefault?: boolean;
    isActive?: boolean;
};

export type UpdateCompanyThemeDto = Partial<
    Omit<CreateCompanyThemeDto, "companyId">
>;