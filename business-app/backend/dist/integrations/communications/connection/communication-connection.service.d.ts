import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { IntegrationConnectionDocument } from './communication-connection.schema';
import { CryptoService } from '../../../infrastructure/common/security/crypto.service';
import { IntegrationConnectionResponseDto } from './dto/communication-connection.dto';
import { UserDocument } from '../../../modules/users/schemas/user.schema';
import { BusinessDocument } from '../../../modules/business/schemas/business.schema';
export interface TestResult {
    success: boolean;
    status: 'connected' | 'failed';
    message: string;
    checkedAt: string;
    remoteCompanyId?: string;
    remoteCompanyKey?: string;
    remoteCompanyName?: string;
}
export interface BusinessConnection {
    communicationCompanyId: string;
    decryptedToken: string;
    status: 'connected' | 'failed' | null;
    isActive: boolean;
}
export declare class CommunicationConnectionService {
    private readonly model;
    private readonly userModel;
    private readonly businessModel;
    private readonly crypto;
    private readonly http;
    private readonly config;
    private readonly logger;
    constructor(model: Model<IntegrationConnectionDocument>, userModel: Model<UserDocument>, businessModel: Model<BusinessDocument>, crypto: CryptoService, http: HttpService, config: ConfigService);
    private get baseUrl();
    private resolveBusinessId;
    resolveBusinessIdForUser(userId: string): Promise<string>;
    private businessQuery;
    private verifyTokenWithRemote;
    getCommunicationConnectionForContext(type: 'platform' | 'business', businessId?: string): Promise<BusinessConnection | null>;
    getConnectionForBusiness(businessId: string): Promise<BusinessConnection | null>;
    get(userId: string, provider: string): Promise<IntegrationConnectionResponseDto | null>;
    save(userId: string, provider: string, token: string, isActive?: boolean): Promise<IntegrationConnectionResponseDto>;
    test(userId: string, provider: string, token?: string): Promise<TestResult>;
    toggle(userId: string, provider: string, isActive: boolean): Promise<IntegrationConnectionResponseDto>;
    delete(userId: string, provider: string): Promise<{
        deleted: boolean;
    }>;
    findAllActiveBusinessConnections(): Promise<Array<{
        businessId: string;
        remoteCompanyId: string;
        decryptedToken: string;
    }>>;
}
