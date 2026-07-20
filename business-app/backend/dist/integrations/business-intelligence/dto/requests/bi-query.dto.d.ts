export interface BiQueryRequest {
    businessId: string;
    domain: string;
    dimensions?: string[];
    measures?: string[];
    kpis?: string[];
    filters?: Record<string, unknown>;
    groupBy?: string[];
    orderBy?: string[];
    limit?: number;
    offset?: number;
}
