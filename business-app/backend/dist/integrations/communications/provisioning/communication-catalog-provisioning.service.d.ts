import { ConfigService } from '@nestjs/config';
import { CommunicationsClientService } from '../client/communications-client.service';
import { CommunicationConnectionService } from '../connection/communication-connection.service';
export declare class CommunicationCatalogProvisioningService {
    private readonly commClient;
    private readonly connectionService;
    private readonly config;
    private readonly logger;
    constructor(commClient: CommunicationsClientService, connectionService: CommunicationConnectionService, config: ConfigService);
    private get adminApiKey();
    provisionPlatformCatalog(): Promise<void>;
    provisionBusinessCatalog(businessId: string): Promise<void>;
    syncBusinessCatalog(businessId: string): Promise<void>;
    syncAllBusinessesWithActiveConnection(): Promise<void>;
    private provisionDomain;
}
