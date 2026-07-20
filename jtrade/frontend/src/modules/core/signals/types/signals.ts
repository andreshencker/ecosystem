export type SignalIndicator = {
    id: string | null;
    name: string | null;
    key: string | null;
};

export type SignalCreatedBy = {
    name: string;
};

export type ClientSignal = {
    signalId: string;
    alertId: string;
    symbol: string;
    timeFrame: string;
    action: "BUY" | "SELL";
    isActive: boolean;
    createdAt: string;
    indicator?: SignalIndicator | null;
};

export type AdminSignal = {
    signalId: string;
    alertId: string;
    symbol: string;
    timeFrame: string;
    action: "BUY" | "SELL";
    isActive: boolean;
    createdAt: string;
    indicator?: SignalIndicator | null;
    createdBy?: SignalCreatedBy | null;
};

export type ClientSignalsParams = {
    symbol?: string;
    timeFrame?: string;
    indicatorId?: string;
    lastHours?: string | number;
    dateFrom?: string;
    dateTo?: string;
};

export type AdminSignalsParams = {
    symbol?: string;
    timeFrame?: string;
    indicatorId?: string;
    adminIndicatorId?: string;
    lastHours?: string | number;
    dateFrom?: string;
    dateTo?: string;
};

export type SignalFilterOption = {
    label: string;
    value: string;
};