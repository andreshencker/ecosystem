import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CommunicationConnectionService } from '../connection/communication-connection.service';
import type { CreateCommunicationEventDto } from './dto/create-communication-event.dto';
import type { UpdateCommunicationEventDto } from './dto/update-communication-event.dto';
import type { CommunicationEventListQueryDto } from './dto/communication-event-list-query.dto';
import type { CommunicationEventListResponseDto, CommunicationEventResponseDto } from './dto/communication-event-response.dto';
export declare class CommunicationEventsService {
    private readonly connections;
    private readonly http;
    private readonly config;
    private readonly logger;
    constructor(connections: CommunicationConnectionService, http: HttpService, config: ConfigService);
    private get baseUrl();
    private get adminApiKey();
    private commsHeaders;
    private resolveConn;
    private forwardError;
    private fetchAndAssertOwnership;
    list(businessId: string, params: CommunicationEventListQueryDto): Promise<CommunicationEventListResponseDto>;
    findOne(businessId: string, id: string): Promise<CommunicationEventResponseDto>;
    create(businessId: string, dto: CreateCommunicationEventDto): Promise<CommunicationEventResponseDto>;
    update(businessId: string, id: string, dto: UpdateCommunicationEventDto): Promise<CommunicationEventResponseDto>;
    remove(businessId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    bulkImport(businessId: string, domainCatalogueId: string, items: Record<string, any>[]): Promise<CommunicationEventResponseDto[]>;
}
