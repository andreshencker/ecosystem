import { CommunicationPurposesService } from './communication-purposes.service';
import { CreatePurposeDto } from './dto/create-purpose.dto';
import { UpdatePurposeDto } from './dto/update-purpose.dto';
import { PurposeListQueryDto } from './dto/purpose-list-query.dto';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
export declare class CommunicationPurposesController {
    private readonly purposes;
    constructor(purposes: CommunicationPurposesService);
    private resolveBusinessId;
    getCredentialOptions(ctx: AuthContext, channel: 'email' | 'sms'): Promise<import("./dto/purpose-response.dto").CredentialOptionDto[]>;
    list(ctx: AuthContext, query: PurposeListQueryDto): Promise<import("./dto/purpose-response.dto").PurposeListResponseDto>;
    create(ctx: AuthContext, dto: CreatePurposeDto): Promise<import("./dto/purpose-response.dto").PurposeResponseDto>;
    findOne(ctx: AuthContext, id: string): Promise<import("./dto/purpose-response.dto").PurposeResponseDto>;
    update(ctx: AuthContext, id: string, dto: UpdatePurposeDto): Promise<import("./dto/purpose-response.dto").PurposeResponseDto>;
    remove(ctx: AuthContext, id: string): Promise<{
        deleted: boolean;
    }>;
}
