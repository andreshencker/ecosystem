export class UserAccountInfoResponseDto {
  id!: string;

  userProjectPlatformId!: string;
  indicatorProjectId!: string;

  accountRef?: string | null;
  accountLabel?: string | null;

  canTrade!: boolean;

  useDrawdownLimit!: boolean;
  useProfitLimit!: boolean;
  maxDrawdownPercent!: number;
  maxProfitPercent!: number;

  isActive!: boolean;

  userProjectPlatform?: any;
  indicatorProject?: any;

  createdAt?: string;
  updatedAt?: string;
}