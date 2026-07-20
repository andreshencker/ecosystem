import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CommunicationConnectionService } from '../connection/communication-connection.service';
import type { NotifyEventParams } from './dto/notify-event-params.interface';
import type { CatalogDomain, CatalogEvent } from '../catalog/communication-catalog.types';
export declare class CommunicationsClientService {
    private readonly connections;
    private readonly http;
    private readonly config;
    private readonly logger;
    constructor(connections: CommunicationConnectionService, http: HttpService, config: ConfigService);
    private get baseUrl();
    private get adminApiKey();
    notifyEvent(params: NotifyEventParams): Promise<boolean>;
    verifyIntegrationToken(rawToken: string): Promise<{
        success: boolean;
        remoteCompanyId?: string;
        remoteCompanyKey?: string;
        remoteCompanyName?: string;
        message: string;
    }>;
    getDomains(remoteCompanyId: string, apiKey: string): Promise<any[] | null>;
    createDomain(remoteCompanyId: string, apiKey: string, domain: CatalogDomain): Promise<string | null>;
    getEvents(domainCatalogueId: string, apiKey: string): Promise<any[]>;
    createEvent(domainCatalogueId: string, apiKey: string, event: CatalogEvent, scope: 'platform' | 'business'): Promise<void>;
}
