import { OnApplicationBootstrap } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserDocument } from './schemas/user.schema';
import { BusinessDocument } from '../business/schemas/business.schema';
export declare class UsersBootstrapService implements OnApplicationBootstrap {
    private readonly userModel;
    private readonly companyModel;
    private readonly logger;
    private static readonly BOOTSTRAP_EMAIL;
    private static readonly BOOTSTRAP_PASSWORD;
    constructor(userModel: Model<UserDocument>, companyModel: Model<BusinessDocument>);
    onApplicationBootstrap(): Promise<void>;
    private ensurePlatformCompany;
    private ensurePlatformAdmin;
    private repairOrphanedBusinessUsers;
    private logBootstrapSummary;
    private slugify;
}
