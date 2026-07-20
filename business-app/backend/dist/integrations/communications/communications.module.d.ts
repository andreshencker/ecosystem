import { OnApplicationBootstrap } from '@nestjs/common';
import { Connection } from 'mongoose';
import { CommunicationCatalogProvisioningService } from './provisioning/communication-catalog-provisioning.service';
export declare class CommunicationsModule implements OnApplicationBootstrap {
    private readonly provisioning;
    private readonly connection;
    private readonly logger;
    constructor(provisioning: CommunicationCatalogProvisioningService, connection: Connection);
    onApplicationBootstrap(): void;
    private dropStaleCompanyProviderIndex;
}
