import { CommunicationEventsService } from './communication-events.service';
import { CreateCommunicationEventDto } from './dto/create-communication-event.dto';
import { UpdateCommunicationEventDto } from './dto/update-communication-event.dto';
import { CommunicationEventListQueryDto } from './dto/communication-event-list-query.dto';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
export declare class CommunicationEventsController {
    private readonly events;
    constructor(events: CommunicationEventsService);
    private resolveBusinessId;
    bulkImport(ctx: AuthContext, body: {
        domainCatalogueId: string;
        items: Record<string, any>[];
    }): Promise<import("./dto/communication-event-response.dto").CommunicationEventResponseDto[]>;
    list(ctx: AuthContext, query: CommunicationEventListQueryDto): Promise<import("./dto/communication-event-response.dto").CommunicationEventListResponseDto>;
    create(ctx: AuthContext, dto: CreateCommunicationEventDto): Promise<import("./dto/communication-event-response.dto").CommunicationEventResponseDto>;
    findOne(ctx: AuthContext, id: string): Promise<import("./dto/communication-event-response.dto").CommunicationEventResponseDto>;
    update(ctx: AuthContext, id: string, dto: UpdateCommunicationEventDto): Promise<import("./dto/communication-event-response.dto").CommunicationEventResponseDto>;
    remove(ctx: AuthContext, id: string): Promise<{
        deleted: boolean;
    }>;
}
