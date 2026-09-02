import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Invitation, InvitationDocument } from './schemas/invitation.schema';
import type { InvitationStatus } from './schemas/invitation.schema';
import type { UserRole } from '../users/schemas/user.schema';
import {
  Business,
  BusinessDocument,
} from '../business/schemas/business.schema';
import { UsersService } from '../users/users.service';
import {
  EventBusService,
  InvitationPasswordCompletedPayload,
  PLATFORM_EVENTS,
} from '../../infrastructure/events/event-bus.service';
import { RelayClientService } from '../../integrations/relay/client/relay-client.service';

@Injectable()
export class UserInvitationsService implements OnModuleInit {
  private readonly logger = new Logger(UserInvitationsService.name);

  constructor(
    @InjectModel(Invitation.name)
    private readonly invitationModel: Model<InvitationDocument>,
    @InjectModel(Business.name)
    private readonly companyModel: Model<BusinessDocument>,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    private readonly eventBus: EventBusService,
    private readonly commClient: RelayClientService,
  ) {}

  /** Subscribe to the cross-module password-changed event (DEC-013). */
  onModuleInit(): void {
    this.eventBus.on(
      PLATFORM_EVENTS.USER_INVITATION_PASSWORD_COMPLETED,
      (payload: InvitationPasswordCompletedPayload) => {
        this.handlePasswordCompleted(payload).catch((err) =>
          this.logger.warn(
            `handlePasswordCompleted failed for ${payload.email}: ${err?.message}`,
          ),
        );
      },
    );
  }

  // ── Public: complete invitation flows ─────────────────────────────────────

  /**
   * Creates a user account, dispatches the correct invitation notification based
   * on the actor+target role scenario, and writes the invitation audit record.
   * Called by UserInvitationsController.invite().
   */
  async sendInvitation(params: {
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
  }> {
    // 0. Normalise email and run duplicate guards before any writes.
    const normalizedEmail = params.email.trim().toLowerCase();
    this.logger.log(`[sendInvitation] normalizedEmail=${normalizedEmail}`);

    // Guard A: user with this email already exists in the system.
    const existingUser = await this.usersService.existsByEmail(normalizedEmail);
    this.logger.log(
      `[sendInvitation] existingUserFound=${existingUser} normalizedEmail=${normalizedEmail}`,
    );
    if (existingUser) {
      this.logger.warn(
        `[sendInvitation] blocked=duplicate_user normalizedEmail=${normalizedEmail}`,
      );
      throw new BadRequestException('A user with this email already exists.');
    }

    // Guard B: a pending or pending_delivery invitation already exists for this email.
    const existingInvitation = (await this.invitationModel
      .findOne({
        email: normalizedEmail,
        status: { $in: ['pending', 'pending_delivery'] },
      })
      .lean()
      .exec()) as any;
    const existingInvitationFound = !!existingInvitation;
    this.logger.log(
      `[sendInvitation] existingInvitationFound=${existingInvitationFound} normalizedEmail=${normalizedEmail}` +
        (existingInvitation
          ? ` invitationStatus=${existingInvitation.status}`
          : ''),
    );
    if (existingInvitation) {
      this.logger.warn(
        `[sendInvitation] blocked=duplicate_invitation normalizedEmail=${normalizedEmail} status=${existingInvitation.status}`,
      );
      throw new BadRequestException(
        'There is already a pending invitation for this email.',
      );
    }

    this.logger.log(
      `[sendInvitation] guards passed — proceeding normalizedEmail=${normalizedEmail}`,
    );

    // 1. Create user account (user state is a UsersService responsibility)
    const { user, tempPassword } = await this.usersService.createInvitedUser({
      email: normalizedEmail,
      firstName: params.firstName,
      lastName: params.lastName,
      role: params.targetRole,
      companyId: params.companyId,
      businessKey: params.businessKey,
    });

    // 3. Dispatch invitation notification (fire-and-forget — never blocks user creation).
    const invitationScope: 'platform' | 'company' =
      params.targetRole === 'platform_admin' ? 'platform' : 'company';

    let emailDelivered = false;
    if (params.companyId && invitationScope === 'company') {
      const businessName = await this.usersService
        .getCompanyDisplayName(params.companyId)
        .catch(() => '');
      const eventKey =
        params.targetRole === 'business_admin'
          ? 'security.company_admin_invitation'
          : 'security.company_user_invitation';

      emailDelivered = await this.commClient.notifyEvent({
        type: 'platform',
        event: eventKey,
        email: params.email,
        data: {
          firstName: params.firstName,
          email: params.email,
          businessName,
          role: params.targetRole,
          tempPassword,
          loginUrl: this.buildLoginUrl(),
        },
      });
    }

    // 4. Write invitation audit record
    const invitation = await this.createInvitationRecord({
      userId: String(user._id ?? (user as any).id),
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      role: params.targetRole,
      companyId: params.companyId,
      businessKey: params.businessKey,
      invitedByUserId: params.invitedByUserId,
      invitationScope,
      status: emailDelivered ? 'pending' : 'pending_delivery',
    });

    return {
      userId: String(user._id ?? (user as any).id),
      invitationId: String(invitation._id),
      emailDelivered,
      message: emailDelivered
        ? `User created successfully. Invitation email sent to ${params.email}.`
        : `User created successfully. Invitation email could not be delivered. Please configure the company email provider credentials and try again.`,
    };
  }

  /**
   * Validates state, checks actor scope, refreshes the temp password,
   * dispatches the resend notification, and updates invitation status.
   * Called by UserInvitationsController.resendInvitation().
   */
  async resendInvitation(
    invitationId: string,
    actor: { scope: string; companyId: string | null },
  ): Promise<{
    emailDelivered: boolean;
    message: string;
    invitationEmail: string;
  }> {
    const invitation = (await this.invitationModel
      .findById(invitationId)
      .lean()
      .exec()) as any;
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (invitation.status === 'cancelled') {
      throw new BadRequestException('Cannot resend a cancelled invitation');
    }
    if (invitation.status === 'accepted') {
      throw new BadRequestException(
        'Cannot resend — the user has already accepted this invitation',
      );
    }
    if (
      invitation.status === 'expired' ||
      new Date(invitation.expiresAt) < new Date()
    ) {
      await this.invitationModel.findByIdAndUpdate(invitationId, {
        $set: { status: 'expired' },
      });
      throw new BadRequestException(
        'This invitation has expired. Please create a new invitation.',
      );
    }
    if (!invitation.userId) {
      throw new BadRequestException(
        'Invitation has no associated user account',
      );
    }

    // Company-scoped actors may only resend within their own company.
    if (
      actor.scope === 'company' &&
      invitation.companyId !== String(actor.companyId)
    ) {
      throw new ForbiddenException(
        'You can only resend invitations within your company',
      );
    }

    // Refresh temp password (user state is a UsersService responsibility)
    const newTempPassword = await this.usersService.refreshTemporaryPassword(
      invitation.userId,
    );

    // Dispatch resend notification (fire-and-forget).
    let emailDelivered = false;
    if (invitation.companyId && invitation.invitationScope === 'company') {
      const businessName = await this.usersService
        .getCompanyDisplayName(invitation.companyId)
        .catch(() => '');
      emailDelivered = await this.commClient.notifyEvent({
        type: 'platform',
        event: 'security.company_invitation_resent',
        email: invitation.email,
        data: {
          firstName: invitation.firstName,
          email: invitation.email,
          businessName,
          role: invitation.role,
          tempPassword: newTempPassword,
          loginUrl: this.buildLoginUrl(),
        },
      });
    }

    await this.updateInvitationStatus(
      invitationId,
      emailDelivered ? 'pending' : 'pending_delivery',
    );

    return {
      emailDelivered,
      invitationEmail: invitation.email,
      message: emailDelivered
        ? `Invitation resent to ${invitation.email}.`
        : `Could not deliver invitation email. Please configure the company email provider credentials and try again.`,
    };
  }

  // ── Public: record management ─────────────────────────────────────────────

  async createInvitationRecord(params: {
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
  }): Promise<InvitationDocument> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    return this.invitationModel.create({
      userId: params.userId,
      email: params.email.toLowerCase().trim(),
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      role: params.role,
      companyId: params.companyId,
      businessKey: params.businessKey,
      tokenHash,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: params.status,
      invitedByUserId: params.invitedByUserId,
      invitationScope: params.invitationScope,
      senderCredentialScope: params.invitationScope,
    });
  }

  async updateInvitationStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<void> {
    await this.invitationModel.findByIdAndUpdate(invitationId, {
      $set: { status },
    });
  }

  async cancelInvitation(
    invitationId: string,
    actor: { scope: string; companyId: string | null },
  ): Promise<void> {
    const invitation = (await this.invitationModel
      .findById(invitationId)
      .lean()
      .exec()) as any;
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (
      actor.scope === 'company' &&
      invitation.companyId !== String(actor.companyId)
    ) {
      throw new ForbiddenException(
        'You can only cancel invitations within your company',
      );
    }

    if (invitation.status === 'cancelled') {
      throw new BadRequestException('Invitation is already cancelled');
    }
    if (invitation.status === 'accepted') {
      throw new BadRequestException(
        'Cannot cancel an accepted invitation — the user has already set their password',
      );
    }
    if (invitation.status === 'expired') {
      throw new BadRequestException('Cannot cancel an expired invitation');
    }

    await this.invitationModel.findByIdAndUpdate(invitationId, {
      $set: { status: 'cancelled' },
    });
  }

  /**
   * Transitions all pending/pending_delivery invitations for this email to "accepted".
   * Called directly from tests and from handlePasswordCompleted.
   */
  async acceptInvitationsByEmail(email: string): Promise<void> {
    await this.invitationModel.updateMany(
      {
        email: email.toLowerCase().trim(),
        status: { $in: ['pending', 'pending_delivery'] },
      },
      { $set: { status: 'accepted' } },
    );
  }

  async listInvitations(
    actorScope: string,
    actorCompanyId: string | null,
  ): Promise<InvitationDocument[]> {
    await this.expireStaleInvitations();
    const filter: Record<string, any> =
      actorScope === 'global'
        ? { invitationScope: 'platform' }
        : { companyId: actorCompanyId };
    filter['status'] = {
      $in: ['pending', 'pending_delivery', 'expired', 'cancelled'],
    };
    return this.invitationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();
  }

  async getCompanyName(companyId: string): Promise<string> {
    try {
      const doc = (await this.companyModel
        .findById(companyId)
        .lean()
        .exec()) as any;
      return doc?.businessName ?? companyId;
    } catch {
      return companyId;
    }
  }

  // ── Private: event bus handler ────────────────────────────────────────────

  /**
   * Triggered when a user completes their forced first-login password change.
   * Accepts all pending invitations for the email and sends the welcome message
   * for company-scoped invitations.
   */
  private async handlePasswordCompleted({
    email,
  }: InvitationPasswordCompletedPayload): Promise<void> {
    const pending = (await this.invitationModel
      .find({
        email: email.toLowerCase().trim(),
        status: { $in: ['pending', 'pending_delivery'] },
      })
      .lean()
      .exec()) as any[];

    if (pending.length === 0) return;

    // Accept all pending invitations for this email
    await this.invitationModel.updateMany(
      {
        email: email.toLowerCase().trim(),
        status: { $in: ['pending', 'pending_delivery'] },
      },
      { $set: { status: 'accepted' } },
    );

    // Send welcome message for each company-scoped invitation (fire-and-forget).
    for (const inv of pending) {
      if (inv.companyId && inv.invitationScope === 'company') {
        const businessName = await this.usersService
          .getCompanyDisplayName(inv.companyId)
          .catch(() => '');
        this.commClient
          .notifyEvent({
            type: 'platform',
            event: 'security.company_welcome_message',
            email: inv.email,
            data: {
              firstName: inv.firstName,
              email: inv.email,
              businessName,
              role: inv.role,
              loginUrl: this.buildLoginUrl(),
            },
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `company_welcome_message threw for ${inv.email}: ${msg}`,
            );
          });
      }
    }
  }

  // ── Private: stale record maintenance ────────────────────────────────────

  private async expireStaleInvitations(): Promise<void> {
    await this.invitationModel.updateMany(
      {
        status: { $in: ['pending', 'pending_delivery'] },
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: 'expired' } },
    );
  }

  private buildLoginUrl(): string {
    return (
      (
        this.config.get<string>('APP_BASE_URL') || 'http://localhost:3005'
      ).replace(/\/$/, '') + '/auth/login'
    );
  }
}
