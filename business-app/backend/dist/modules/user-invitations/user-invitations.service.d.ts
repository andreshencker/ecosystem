import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { InvitationDocument } from './schemas/invitation.schema';
import type { InvitationStatus } from './schemas/invitation.schema';
import type { UserRole } from '../users/schemas/user.schema';
import { BusinessDocument } from '../business/schemas/business.schema';
import { UsersService } from '../users/users.service';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
export declare class UserInvitationsService implements OnModuleInit {
    private readonly invitationModel;
    private readonly companyModel;
    private readonly usersService;
    private readonly config;
    private readonly eventBus;
    private readonly commClient;
    private readonly logger;
    constructor(invitationModel: Model<InvitationDocument>, companyModel: Model<BusinessDocument>, usersService: UsersService, config: ConfigService, eventBus: EventBusService, commClient: CommunicationsClientService);
    onModuleInit(): void;
    sendInvitation(params: {
        actorRole: UserRole;
        invitedByUserId: string;
        email: string;
        firstName: string;
        lastName: string;
        targetRole: UserRole;
        companyId: string | null;
        businessKey: string | null;
    }): Promise<{
        userId: string;
        invitationId: string;
        emailDelivered: boolean;
        message: string;
    }>;
    resendInvitation(invitationId: string, actor: {
        scope: string;
        companyId: string | null;
    }): Promise<{
        emailDelivered: boolean;
        message: string;
        invitationEmail: string;
    }>;
    createInvitationRecord(params: {
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        companyId: string | null;
        businessKey: string | null;
        invitedByUserId: string;
        invitationScope: 'platform' | 'company';
        status: 'pending' | 'pending_delivery';
    }): Promise<InvitationDocument>;
    updateInvitationStatus(invitationId: string, status: InvitationStatus): Promise<void>;
    cancelInvitation(invitationId: string, actor: {
        scope: string;
        companyId: string | null;
    }): Promise<void>;
    acceptInvitationsByEmail(email: string): Promise<void>;
    listInvitations(actorScope: string, actorCompanyId: string | null): Promise<InvitationDocument[]>;
    getCompanyName(companyId: string): Promise<string>;
    private handlePasswordCompleted;
    private expireStaleInvitations;
    private buildLoginUrl;
}
