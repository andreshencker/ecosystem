import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export declare class UsersController {
    private readonly users;
    private readonly config;
    private readonly eventBus;
    private readonly commClient;
    private readonly logger;
    constructor(users: UsersService, config: ConfigService, eventBus: EventBusService, commClient: CommunicationsClientService);
    list(ctx: AuthContext, page?: string, limit?: string, search?: string, companyId?: string): Promise<{
        items: UserResponseDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    getMe(ctx: AuthContext): Promise<UserResponseDto>;
    updateMe(ctx: AuthContext, dto: UpdateUserDto): Promise<UserResponseDto>;
    changePassword(ctx: AuthContext, dto: ChangePasswordDto): Promise<UserResponseDto>;
    deleteUser(targetId: string, ctx: AuthContext): Promise<{
        deleted: boolean;
    }>;
    deactivateUser(targetId: string, ctx: AuthContext): Promise<UserResponseDto>;
    reactivateUser(targetId: string, ctx: AuthContext): Promise<UserResponseDto>;
    sendPasswordReset(targetId: string, ctx: AuthContext): Promise<{
        message: string;
    }>;
    getUser(targetId: string, ctx: AuthContext): Promise<UserResponseDto>;
    updateUser(targetId: string, ctx: AuthContext, dto: UpdateUserDto): Promise<UserResponseDto>;
    private buildFrontendUrl;
    private buildLoginUrl;
}
export {};
