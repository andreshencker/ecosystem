export interface DashboardSummaryResult {
    businessId: string;
    period?: string | null;
    customers: {
        total: number;
        active: number;
        newThisPeriod: number;
    };
    calculatedAt: string;
}
