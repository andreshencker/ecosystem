import { UserInvitationsService } from './user-invitations.service';
import { UsersService } from '../users/users.service';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { InviteUserDto } from './dto/invite-user.dto';
import { InvitationMapper } from './mappers/invitation.mapper';
export declare class UserInvitationsController {
    private readonly userInvitations;
    private readonly users;
    constructor(userInvitations: UserInvitationsService, users: UsersService);
    invite(ctx: AuthContext, dto: InviteUserDto): Promise<{
        userId: string;
        invitationId: string;
        email: string;
        role: string;
        emailDelivered: boolean;
        message: string;
    }>;
    getInvitations(ctx: AuthContext): Promise<{
        items: ReturnType<typeof InvitationMapper.toResponse>[];
    }>;
    resendInvitation(id: string, ctx: AuthContext): Promise<{
        message: string;
        emailDelivered: boolean;
    }>;
    cancelInvitation(id: string, ctx: AuthContext): Promise<{
        cancelled: boolean;
    }>;
    private resolveTargetCompany;
}
