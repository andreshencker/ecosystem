import { Model } from 'mongoose';
import { BusinessDocument } from './schemas/business.schema';
import { BusinessSmtpDocument } from './schemas/business-smtp.schema';
import { CryptoService } from '../../infrastructure/common/security/crypto.service';
import { UsersService } from '../users/users.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessSmtpDto } from './dto/update-business-smtp.dto';
import { BusinessSmtpResponseDto } from './dto/business-smtp-response.dto';
import { BusinessResponseDto } from './dto/business-response.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
export declare class BusinessService {
    private readonly businessModel;
    private readonly smtpModel;
    private readonly crypto;
    private readonly users;
    private readonly logger;
    constructor(businessModel: Model<BusinessDocument>, smtpModel: Model<BusinessSmtpDocument>, crypto: CryptoService, users: UsersService);
    private resolveCompanyId;
    private assertCanEdit;
    getOwnCompany(ctx: AuthContext): Promise<BusinessResponseDto>;
    updateOwnCompany(ctx: AuthContext, dto: UpdateBusinessDto): Promise<BusinessResponseDto>;
    getFiscalProfile(ctx: AuthContext): Promise<{
        companyId: string;
        abn: string | null;
        depositAccount: {
            bsb: string | null;
            accountNumber: string | null;
        };
        defaultCurrency: string;
    }>;
    updateFiscalProfile(ctx: AuthContext, dto: {
        abn?: string;
        depositAccount?: {
            bsb?: string;
            accountNumber?: string;
        };
        defaultCurrency?: string;
    }): Promise<{
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
