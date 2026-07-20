import { BusinessService } from './business.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessSmtpDto } from './dto/update-business-smtp.dto';
import { BusinessSmtpResponseDto } from './dto/business-smtp-response.dto';
import { UpdateFiscalProfileDto } from './dto/fiscal-profile.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
export declare class BusinessController {
    private readonly service;
    constructor(service: BusinessService);
    getOwnCompany(ctx: AuthContext): Promise<import("./dto/business-response.dto").BusinessResponseDto>;
    updateOwnCompany(ctx: AuthContext, dto: UpdateBusinessDto): Promise<import("./dto/business-response.dto").BusinessResponseDto>;
    getFiscalProfile(ctx: AuthContext): Promise<{
        companyId: string;
        abn: string | null;
        depositAccount: {
            bsb: string | null;
            accountNumber: string | null;
        };
        defaultCurrency: string;
    }>;
    updateFiscalProfile(ctx: AuthContext, dto: UpdateFiscalProfileDto): Promise<{
        companyId: string;
        abn: string | null;
        depositAccount: {
            bsb: string | null;
            accountNumber: string | null;
        };
        defaultCurrency: string;
    }>;
    getSmtp(ctx: AuthContext): Promise<BusinessSmtpResponseDto>;
    updateSmtp(ctx: AuthContext, dto: UpdateBusinessSmtpDto): Promise<BusinessSmtpResponseDto>;
    testSmtp(ctx: AuthContext): Promise<{
        ok: boolean;
        message: string;
    }>;
}
