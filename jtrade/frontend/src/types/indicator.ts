// src/types/indicator.ts

export const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export type IndicatorPair = {
    /** Stable channel id (survives key rotation). Present on responses. */
    id?: string;
    symbolId: string;
    /** Resolved symbol name — present on responses, ignored on writes. */
    symbol?: string;
    timeframe: Timeframe;
    /** Paste into the TradingView BUY alert. Present on responses. */
    buyKey?: string;
    /** Paste into the TradingView SELL alert. Present on responses. */
    sellKey?: string;
    enabled?: boolean;
    lastSignalAt?: string | null;
};

export type Indicator = {
    id?: string;
    providerOrganizationId: string;
    name: string;
    key: string;
    description: string;
    /** 32-hex slug for the public webhook path /webhooks/tv/:slug. */
    webhookSlug: string;
    webhookLastReceivedAt: string | null;
    pairs: IndicatorPair[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateIndicatorPayload = {
    name: string;
    key: string;
    description?: string;
    isActive?: boolean;
};

export type UpdateIndicatorPayload = {
    name?: string;
    description?: string;
    isActive?: boolean;
};

/** Adding one alert channel to an indicator. */
export type AddChannelPayload = { symbolId: string; timeframe: Timeframe };
