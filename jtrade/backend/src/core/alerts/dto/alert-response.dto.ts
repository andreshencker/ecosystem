export class AlertResponseDto {
  id!: string;

  groupId!: string;
  indicatorProjectId!: string;
  symbolId!: string;

  symbol!: string;
  timeFrame!: string;
  action!: 'BUY' | 'SELL';

  isActive!: boolean;

  symbolData?: {
    id: string;
    symbol: string;
    isActive?: boolean;
    companyProviderId?: string;
  } | null;

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
  } | null;

  createdAt?: string;
  updatedAt?: string;
}
