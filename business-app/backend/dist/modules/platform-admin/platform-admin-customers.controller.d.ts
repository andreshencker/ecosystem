import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { BusinessIntelligenceService } from '../../integrations/business-intelligence/business-intelligence.service';
import { PlatformAdminCustomerQueryDto } from './dto/platform-admin-customer-query.dto';
export declare class PlatformAdminCustomersController {
    private readonly bi;
    private readonly logger;
    constructor(bi: BusinessIntelligenceService);
    private assertPlatformAdmin;
    private mapBIError;
    listCustomers(ctx: AuthContext, query: PlatformAdminCustomerQueryDto): Promise<import("./dto/bi-customer.dto").BiCustomerListResponse>;
    getCustomer(ctx: AuthContext, id: string, businessId?: string): Promise<import("./dto/bi-customer.dto").BiCustomerDetailResponse>;
}
