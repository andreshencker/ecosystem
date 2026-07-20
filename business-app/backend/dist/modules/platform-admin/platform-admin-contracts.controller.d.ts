import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { BusinessIntelligenceService } from '../../integrations/business-intelligence/business-intelligence.service';
import { PlatformAdminContractQueryDto, PlatformAdminContractSummaryQueryDto } from './dto/platform-admin-contract-query.dto';
export declare class PlatformAdminContractsController {
    private readonly bi;
    private readonly logger;
    constructor(bi: BusinessIntelligenceService);
    private assertPlatformAdmin;
    private mapBIError;
    getSummary(ctx: AuthContext, query: PlatformAdminContractSummaryQueryDto): Promise<import("../../integrations/business-intelligence/business-intelligence.service").BiContractAdminSummaryResponse>;
    listContracts(ctx: AuthContext, query: PlatformAdminContractQueryDto): Promise<import("../../integrations/business-intelligence/business-intelligence.service").BiContractAdminListResponse>;
    getContract(ctx: AuthContext, id: string, businessId?: string): Promise<import("../../integrations/business-intelligence/business-intelligence.service").BiContractAdminDetail>;
    getContractIssues(ctx: AuthContext, id: string, businessId?: string): Promise<import("../../integrations/business-intelligence/business-intelligence.service").BiContractSupportIssueListResponse>;
}
