import type { Product } from "@/types/products";

export type SymbolExecution = {
    channelId: string;
    indicatorId: string;
    symbol: string;
    timeFrame: string;
    contractSize: number;
    riskPercent: number;
    stopDistancePips: number;
    returnRatio: number;
    isActive: boolean;
    useStopLoss: boolean;
    useTakeProfit: boolean;
    useTrailingStop: boolean;
    useBreakEven: boolean;
    atrPeriod: number;
    atrMultiplier: number;
    closeTradesOnWeekend: boolean;
};

export type Signalbot = {
    _id: string;
    id?: string;
    grapiflyUserId: string;
    productId: Product | string;
    providerOrganizationId: string;
    token: string;
    accountRef: string | null;
    accountLabel: string | null;
    canTrade: boolean;
    useDrawdownLimit: boolean;
    useProfitLimit: boolean;
    maxDrawdownPercent: number;
    maxProfitPercent: number;
    isActive: boolean;
    symbolExecutions: SymbolExecution[];
    createdAt?: string;
    updatedAt?: string;
};

export type AvailableChannel = {
    channelId: string;
    indicatorId: string;
    indicatorName: string;
    symbol: string;
    timeframe: string;
    alreadyAdded: boolean;
};

export type CreateSignalbotPayload = {
    productId: string;
    accountRef?: string;
    accountLabel?: string;
} & Record<string, unknown>;

export type UpdateSignalbotPayload = Record<string, unknown>;

export type ExecutionPayload = { channelId: string } & Record<string, unknown>;
