export class AdminIndicatorResponseDto {
  id!: string;

  indicatorProjectId!: string;

  webhookKey!: string;
  isActive!: boolean;

  indicatorProject?: {
    id: string;
    isActive?: boolean;
    notes?: string;

    indicator?: {
      id: string;
      name?: string;
      key?: string;
      description?: string;
      isActive?: boolean;
    };

    projectCodePlatform?: {
      id: string;
      deliveryMode?: string;
      runtimeMode?: string;
      status?: string;
      isActive?: boolean;

      codeProject?: {
        id: string;
        name?: string;
        projectKey?: string;
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

    companyProvider?: {
      id: string;
      companyName?: string;
      status?: string;
      isVerified?: boolean;
      isActive?: boolean;
    };
  };

  createdAt?: Date;
  updatedAt?: Date;
}

export class AdminIndicatorWebhookKeyDto {
  webhookKey!: string;
}

export class AdminIndicatorWebhookRevealDto {
  webhookKey!: string;
  webhookSecret!: string;
}
