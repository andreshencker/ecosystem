import { Model } from 'mongoose';
import { BusinessDocument } from '../business/schemas/business.schema';
export declare class ProvisioningService {
    private readonly companyModel;
    private readonly logger;
    constructor(companyModel: Model<BusinessDocument>);
    provisionBusiness(companyId: string): Promise<void>;
    private p03FiscalProfileDefaults;
    private p14ChartOfAccountsStub;
    private pDocumentPackagesStub;
    private pCommunicationConnectionStub;
}
