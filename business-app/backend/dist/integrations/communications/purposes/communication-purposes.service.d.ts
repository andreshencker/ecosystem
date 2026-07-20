import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CommunicationConnectionService } from '../connection/communication-connection.service';
import type { CreatePurposeDto } from './dto/create-purpose.dto';
import type { UpdatePurposeDto } from './dto/update-purpose.dto';
import type { PurposeListQueryDto } from './dto/purpose-list-query.dto';
import type { CredentialOptionDto, PurposeListResponseDto, PurposeResponseDto } from './dto/purpose-response.dto';
export declare class CommunicationPurposesService {
    private readonly connections;
    private readonly http;
    private readonly config;
    private readonly logger;
    constructor(connections: CommunicationConnectionService, http: HttpService, config: ConfigService);
    private get baseUrl();
    private get adminApiKey();
    private resolveConn;
    private forwardError;
    private commsHeaders;
    private fetchAndAssertOwnership;
    list(businessId: string, params: PurposeListQueryDto): Promise<PurposeListResponseDto>;
    findOne(businessId: string, id: string): Promise<PurposeResponseDto>;
    create(businessId: string, dto: CreatePurposeDto): Promise<PurposeResponseDto>;
    update(businessId: string, id: string, dto: UpdatePurposeDto): Promise<PurposeResponseDto>;
    remove(businessId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    getCredentialOptions(businessId: string, channel: 'email' | 'sms'): Promise<CredentialOptionDto[]>;
}
