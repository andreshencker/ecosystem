export type IndicatorCompanyProvider = {
    id: string;
    companyName: string;
    email?: string;
    status?: string;
    isVerified?: boolean;
    isActive?: boolean;
};

export type Indicator = {
    id: string;
    companyProviderId: string;

    name: string;
    key: string;
    description?: string;

    isActive: boolean;

    companyProvider?: IndicatorCompanyProvider;

    createdAt?: string;
    updatedAt?: string;
};

export type IndicatorResponseDto = Indicator;

export type CreateIndicatorDto = {
    companyProviderId: string;
    name: string;
    key: string;
    description?: string;
    isActive?: boolean;
};

export type UpdateIndicatorDto = Partial<{
    name: string;
    key: string;
    description: string;
    isActive: boolean;
}>;

export type ListIndicatorsParams = {
    companyProviderId?: string;
    isActive?: boolean;
};

export type IndicatorOption = {
    id: string;
    companyProviderId: string;
    name: string;
    key: string;
    isActive: boolean;
};