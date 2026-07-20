export class SymbolExecutionResponseDto {
  id!: string;
  userAccountInfoId!: string;
  alertGroupId!: string;

  contractSize!: number;
  riskPercent!: number;
  stopDistancePips!: number;
  returnRatio!: number;

  useStopLoss!: boolean;
  useTakeProfit!: boolean;
  useTrailingStop!: boolean;
  useBreakEven!: boolean;

  atrPeriod!: number;
  atrMultiplier!: number;

  closeTradesOnWeekend!: boolean;

  isActive!: boolean;

  userAccountInfo?: any;

  alertGroup?: {
    groupId: string;
    indicatorProjectId: string;
    symbol: string;
    timeFrame: string;
    isActive: boolean;

    actions: {
      id: string;
      action: 'BUY' | 'SELL';
      isActive: boolean;
    }[];

    indicatorProject?: {
      id: string;

      indicator?: {
        id: string;
        name: string;
        key: string;
        description?: string;
        isActive: boolean;
      } | null;
    } | null;
  };

  createdAt?: string;
  updatedAt?: string;
}