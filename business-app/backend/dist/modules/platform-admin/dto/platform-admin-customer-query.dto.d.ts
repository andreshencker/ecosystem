export declare class PlatformAdminCustomerQueryDto {
    search?: string;
    businessId?: string;
    customerType?: 'company' | 'individual';
    isActive?: boolean;
    hasContacts?: boolean;
    hasLocations?: boolean;
    hasCommunicationConfiguration?: boolean;
    hasDataQualityIssues?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: string;
}
