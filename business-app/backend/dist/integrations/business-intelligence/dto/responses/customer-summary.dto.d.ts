export interface CustomerSummaryResult {
    businessId: string;
    period?: string | null;
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    customersByType: Record<string, number>;
    recentCustomers: {
        customerId: string;
        displayName: string;
        customerType: string;
        createdAt: string;
    }[];
    calculatedAt: string;
}
