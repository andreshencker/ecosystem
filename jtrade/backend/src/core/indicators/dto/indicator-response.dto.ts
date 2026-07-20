export class IndicatorResponseDto {
  id!: string;

  companyProviderId!: string;

  name!: string;
  key!: string;
  description?: string;

  isActive!: boolean;

  companyProvider?: {
    id: string;
    companyName: string;
    email?: string;
    status?: string;
    isVerified?: boolean;
    isActive?: boolean;
  };

  createdAt?: Date;
  updatedAt?: Date;
}
