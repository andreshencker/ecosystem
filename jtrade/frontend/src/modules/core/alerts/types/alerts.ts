export type AlertAction = "BUY" | "SELL";

export type Alert = {
    id: string;
    groupId: string;

    indicatorProjectId: string;
    symbolId: string;

    symbol: string;
    timeFrame: string;
    action: AlertAction;
    isActive: boolean;

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
    } | null;

    createdAt?: string;
    updatedAt?: string;
};

export type AlertGroupRow = {
    groupId: string;

    indicatorProjectId: string;
    symbolId: string;

    symbol: string;
    timeFrame: string;
    isActive: boolean;

    actions: {
        id: string;
        action: AlertAction;
        isActive: boolean;
    }[];

    symbolData?: {
        id: string;
        symbol: string;
        isActive?: boolean;
        companyProviderId?: string;
    } | null;

    indicatorProject?: Alert["indicatorProject"];

    createdAt?: string;
    updatedAt?: string;
};

export type QueryAlerts = {
    indicatorProjectId?: string;
    symbolId?: string;
    symbol?: string;
    timeframe?: string;
    isActive?: boolean;
    groupId?: string;
    action?: AlertAction;
};

export type QueryAlertGroups = {
    indicatorProjectId?: string;
    symbolId?: string;
    symbol?: string;
    timeframe?: string;
    isActive?: boolean;
};

export type CreateAlertDto = {
    indicatorProjectId: string;
    symbolId: string;
    timeframe: string;
    isActive?: boolean;
};

export type UpdateAlertDto = {
    symbolId?: string;
    timeframe?: string;
    isActive?: boolean;
};

export type IndicatorProjectOption = {
    id: string;
    name: string;
    indicatorName?: string;
    indicatorKey?: string;
    projectName?: string;
    platformName?: string;
    runtimeMode?: string;
    isActive?: boolean;
};

export type SymbolOption = {
    id: string;
    symbol: string;
    isActive?: boolean;
};