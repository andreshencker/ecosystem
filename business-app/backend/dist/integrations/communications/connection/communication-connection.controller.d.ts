import { CommunicationConnectionService } from './communication-connection.service';
import { SaveConnectionDto, TestConnectionDto, ToggleConnectionDto } from './dto/communication-connection.dto';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
export declare class CommunicationConnectionController {
    private readonly service;
    constructor(service: CommunicationConnectionService);
    get(ctx: AuthContext): Promise<import("./dto/communication-connection.dto").IntegrationConnectionResponseDto>;
    save(ctx: AuthContext, dto: SaveConnectionDto): Promise<import("./dto/communication-connection.dto").IntegrationConnectionResponseDto>;
    test(ctx: AuthContext, dto: TestConnectionDto): Promise<import("./communication-connection.service").TestResult>;
    toggle(ctx: AuthContext, dto: ToggleConnectionDto): Promise<import("./dto/communication-connection.dto").IntegrationConnectionResponseDto>;
    remove(ctx: AuthContext): Promise<{
        deleted: boolean;
    }>;
    private uid;
}
