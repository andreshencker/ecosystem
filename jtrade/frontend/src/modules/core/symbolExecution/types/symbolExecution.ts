export type SymbolExecution = {
    id: string;
    userAccountInfoId: string;
    alertGroupId: string;

    contractSize: number;
    riskPercent: number;
    stopDistancePips: number;
    returnRatio: number;

    useStopLoss: boolean;
    useTakeProfit: boolean;
    useTrailingStop: boolean;
    useBreakEven: boolean;

    atrPeriod: number;
    atrMultiplier: number;

    closeTradesOnWeekend: boolean;

    isActive: boolean;

    userAccountInfo?: any;
    alertGroup?: {
        groupId: string;
        indicatorProjectId?: string;
        indicatorId?: string;
        symbol: string;
        timeFrame: string;
        isActive: boolean;
        actions: {
            id: string;
            action: "BUY" | "SELL";
            isActive: boolean;
        }[];
        indicator?: {
            id: string;
            name: string;
            key: string;
            description?: string;
            isActive: boolean;
        } | null;
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
};

export type CreateSymbolExecutionDto = {
    userAccountInfoId: string;
    alertGroupId: string;

    contractSize: number;
    riskPercent: number;

    stopDistancePips?: number;
    returnRatio?: number;

    useStopLoss?: boolean;
    useTakeProfit?: boolean;
    useTrailingStop?: boolean;
    useBreakEven?: boolean;

    atrPeriod?: number;
    atrMultiplier?: number;

    closeTradesOnWeekend?: boolean;

    isActive?: boolean;
};

export type UpdateSymbolExecutionDto = {
    contractSize?: number;
    riskPercent?: number;

    stopDistancePips?: number;
    returnRatio?: number;

    useStopLoss?: boolean;
    useTakeProfit?: boolean;
    useTrailingStop?: boolean;
    useBreakEven?: boolean;

    atrPeriod?: number;
    atrMultiplier?: number;

    closeTradesOnWeekend?: boolean;

    isActive?: boolean;
};

export type AccountRefSubscriptionsResponse = {
    id: string;
    accountRef: string;
    canTrade: boolean;
    isActive: boolean;

    useDrawdownLimit: boolean;
    useProfitLimit: boolean;
    maxDrawdownPercent: number;
    maxProfitPercent: number;

    platform: string;
    indicatorProjectId: string;
    indicator: string;

    subscriptions: {
        id: string;
        alertGroupId: string;

        symbol: string;
        timeFrame: string;

        buyId?: string;
        sellId?: string;

        contractSize: number;
        riskPercent: number;

        useStopLoss: boolean;
        stopDistancePips: number;

        useTakeProfit: boolean;
        returnRatio: number;

        useTrailingStop: boolean;
        useBreakEven: boolean;

        atrPeriod: number;
        atrMultiplier: number;

        closeTradesOnWeekend: boolean;

        isActive: boolean;
    }[];
};