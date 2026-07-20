export class IndicatorProjectResponseDto {
  id!: string;

  companyProviderId!: string;
  projectCodePlatformId!: string;
  indicatorId!: string;

  isActive!: boolean;
  notes?: string;

  companyProvider?: {
    id: string;
    companyName?: string;
    status?: string;
    isVerified?: boolean;
    isActive?: boolean;
  };

  projectCodePlatform?: {
    id: string;
    deliveryMode?: string;
    runtimeMode?: string;
    status?: string;
    isActive?: boolean;
    notes?: string;

    codeProject?: {
      id: string;
      name?: string;
      projectKey?: string;
      description?: string;
      isActive?: boolean;
    };

    platform?: {
      id: string;
      name?: string;
      category?: string;
      connectionType?: string;
      imageUrl?: string;
      isActive?: boolean;
      isSupported?: boolean;
    };
  };

  indicator?: {
    id: string;
    name?: string;
    key?: string;
    description?: string;
    isActive?: boolean;
  };

  createdAt?: string;
  updatedAt?: string;
}
