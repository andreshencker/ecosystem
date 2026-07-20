import { CompanyProviderStatus } from '../schemas/company-provider.schema';

export class CompanyProviderResponseDto {
  id!: string;

  ownerUserId!: string;

  companyName!: string;
  legalName?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  description?: string;

  status!: CompanyProviderStatus;

  isVerified!: boolean;
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
