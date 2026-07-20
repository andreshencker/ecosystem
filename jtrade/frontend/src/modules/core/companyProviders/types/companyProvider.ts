export type CompanyProviderStatus =
    | "pending"
    | "active"
    | "suspended"
    | "rejected";

export type CompanyProvider = {
    id: string;
    ownerUserId: string;

    companyName: string;
    legalName?: string;
    email?: string;
    phone?: string;
    website?: string;
    logoUrl?: string;
    description?: string;

    status: CompanyProviderStatus;
    isVerified: boolean;
    isActive: boolean;

    createdAt?: string;
    updatedAt?: string;
};

export type CreateCompanyProviderDto = {
    companyName: string;
    legalName?: string;
    email?: string;
    phone?: string;
    website?: string;
    logoUrl?: string;
    description?: string;
};

export type UpdateCompanyProviderDto = Partial<CreateCompanyProviderDto>;