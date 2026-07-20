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
  Company,
  CompanyDocument,
} from '../communication/company/company-info/schemas/company.schema';
import { UsersService } from '../users/users.service';
import { NotificationService } from '../communication/notifications/notification.service';
import {
  EventBusService,
  InvitationPasswordCompletedPayload,
  PLATFORM_EVENTS,
} from '../infrastructure/events/event-bus.service';

// ─── Notification result helper ───────────────────────────────────────────────

interface NotifyResult {
  results: Array<{ success: boolean; error?: string | null }>;
}

@Injectable()
export class UserInvitationsService implements OnModuleInit {
  private readonly logger = new Logger(UserInvitationsService.name);

  constructor(
    @InjectModel(Invitation.name) private readonly invitationModel: Model<InvitationDocument>,
    @InjectModel(Company.name) private readonly companyModel: Model<CompanyDocument>,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
    private readonly eventBus: EventBusService,
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
    companyKey: string | null;
  }): Promise<{ userId: string; invitationId: string; emailDelivered: boolean; message: string }> {
    // 0. Normalise email and run duplicate guards before any writes.
    const normalizedEmail = params.email.trim().toLowerCase();
    this.logger.log(`[sendInvitation] normalizedEmail=${normalizedEmail}`);

    // Guard A: user with this email already exists in the system.
    const existingUser = await this.usersService.existsByEmail(normalizedEmail);
    this.logger.log(`[sendInvitation] existingUserFound=${existingUser} normalizedEmail=${normalizedEmail}`);
    if (existingUser) {
      this.logger.warn(`[sendInvitation] blocked=duplicate_user normalizedEmail=${normalizedEmail}`);
      throw new BadRequestException('A user with this email already exists.');
    }

    // Guard B: a pending or pending_delivery invitation already exists for this email.
    const existingInvitation = await this.invitationModel
      .findOne({ email: normalizedEmail, status: { $in: ['pending', 'pending_delivery'] } })
      .lean()
      .exec() as any;
    const existingInvitationFound = !!existingInvitation;
    this.logger.log(
      `[sendInvitation] existingInvitationFound=${existingInvitationFound} normalizedEmail=${normalizedEmail}` +
      (existingInvitation ? ` invitationStatus=${existingInvitation.status}` : ''),
    );
    if (existingInvitation) {
      this.logger.warn(
        `[sendInvitation] blocked=duplicate_invitation normalizedEmail=${normalizedEmail} status=${existingInvitation.status}`,
      );
      throw new BadRequestException('There is already a pending invitation for this email.');
    }

    this.logger.log(`[sendInvitation] guards passed — proceeding normalizedEmail=${normalizedEmail}`);

    // 1. Create user account (user state is a UsersService responsibility)
    const { user, tempPassword } = await this.usersService.createInvitedUser({
      email:     normalizedEmail,
      firstName: params.firstName,
      lastName:  params.lastName,
      role:      params.targetRole,
      companyId: params.companyId,
      companyKey: params.companyKey,
    });

    // 2. Resolve supporting data
    const companyName = await this.resolveInvitationCompanyName(params.companyId);
    const loginUrl = this.buildLoginUrl();

    // 3. Dispatch the scenario-specific invitation notification
    let emailDelivered = false;
    if (params.companyId) {
      emailDelivered = await this.dispatchInviteNotification({
        actorRole:   params.actorRole,
        targetRole:  params.targetRole,
        companyId:   params.companyId,
        email:       params.email,
        firstName:   params.firstName,
        companyName,
        tempPassword,
        loginUrl,
        role:        params.targetRole,
      });
    }

    // 4. Write invitation audit record
    const invitationScope: 'platform' | 'company' =
      params.targetRole === 'platform_admin' ? 'platform' : 'company';
    const invitation = await this.createInvitationRecord({
      userId:          String(user._id ?? (user as any).id),
      email:           params.email,
      firstName:       params.firstName,
      lastName:        params.lastName,
      role:            params.targetRole,
      companyId:       params.companyId,
      companyKey:      params.companyKey,
      invitedByUserId: params.invitedByUserId,
      invitationScope,
      status:          emailDelivered ? 'pending' : 'pending_delivery',
    });

    return {
      userId:        String(user._id ?? (user as any).id),
      invitationId:  String(invitation._id),
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
  ): Promise<{ emailDelivered: boolean; message: string; invitationEmail: string }> {
    const invitation = await this.invitationModel
      .findById(invitationId)
      .lean()
      .exec() as any;
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (invitation.status === 'cancelled') {
      throw new BadRequestException('Cannot resend a cancelled invitation');
    }
    if (invitation.status === 'accepted') {
      throw new BadRequestException(
        'Cannot resend — the user has already accepted this invitation',
      );
    }
    if (invitation.status === 'expired' || new Date(invitation.expiresAt) < new Date()) {
      await this.invitationModel.findByIdAndUpdate(invitationId, { $set: { status: 'expired' } });
      throw new BadRequestException(
        'This invitation has expired. Please create a new invitation.',
      );
    }
    if (!invitation.userId) {
      throw new BadRequestException('Invitation has no associated user account');
    }

    // Company-scoped actors may only resend within their own company.
    if (actor.scope === 'company' && invitation.companyId !== String(actor.companyId)) {
      throw new ForbiddenException('You can only resend invitations within your company');
    }

    // Refresh temp password (user state is a UsersService responsibility)
    const tempPassword = await this.usersService.refreshTemporaryPassword(invitation.userId);

    // Dispatch resend notification
    const companyId = invitation.companyId as string | null;
    const companyName = await this.resolveInvitationCompanyName(companyId);
    const loginUrl = this.buildLoginUrl();

    let emailDelivered = false;
    if (companyId) {
      emailDelivered = await this.notifyInvitationResent({
        tenantCompanyId: companyId,
        email:       invitation.email,
        firstName:   invitation.firstName,
        companyName,
        tempPassword,
        loginUrl,
        role:        invitation.role,
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
    companyKey: string | null;
    invitedByUserId: string;
    invitationScope: 'platform' | 'company';
    status: 'pending' | 'pending_delivery';
  }): Promise<InvitationDocument> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    return this.invitationModel.create({
      userId:                params.userId,
      email:                 params.email.toLowerCase().trim(),
      firstName:             params.firstName.trim(),
      lastName:              params.lastName.trim(),
      role:                  params.role,
      companyId:             params.companyId,
      companyKey:            params.companyKey,
      tokenHash,
      expiresAt:             new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status:                params.status,
      invitedByUserId:       params.invitedByUserId,
      invitationScope:       params.invitationScope,
      senderCredentialScope: params.invitationScope,
    }) as any;
  }

  async updateInvitationStatus(invitationId: string, status: InvitationStatus): Promise<void> {
    await this.invitationModel.findByIdAndUpdate(invitationId, { $set: { status } });
  }

  async cancelInvitation(
    invitationId: string,
    actor: { scope: string; companyId: string | null },
  ): Promise<void> {
    const invitation = await this.invitationModel
      .findById(invitationId)
      .lean()
      .exec() as any;
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (actor.scope === 'company' && invitation.companyId !== String(actor.companyId)) {
      throw new ForbiddenException('You can only cancel invitations within your company');
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

    await this.invitationModel.findByIdAndUpdate(invitationId, { $set: { status: 'cancelled' } });
  }

  /**
   * Transitions all pending/pending_delivery invitations for this email to "accepted".
   * Called directly from tests and from handlePasswordCompleted.
   */
  async acceptInvitationsByEmail(email: string): Promise<void> {
    await this.invitationModel.updateMany(
      {
        email:  email.toLowerCase().trim(),
        status: { $in: ['pending', 'pending_delivery'] },
      },
      { $set: { status: 'accepted' } },
    );
  }

  async listInvitations(actorScope: string, actorCompanyId: string | null):
      Promise<InvitationDocument[]> {
    await this.expireStaleInvitations();
    const filter: Record<string, any> = actorScope === 'global'
      ? { invitationScope: 'platform' }
      : { companyId: actorCompanyId };
    filter['status'] = { $in: ['pending', 'pending_delivery', 'expired', 'cancelled'] };
    return this.invitationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec() as any;
  }

  async getCompanyName(companyId: string): Promise<string> {
    try {
      const doc = await this.companyModel.findById(companyId).lean().exec() as any;
      return doc?.displayName ?? companyId;
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
  private async handlePasswordCompleted({ email }: InvitationPasswordCompletedPayload): Promise<void> {
    const pending = await this.invitationModel
      .find({
        email:  email.toLowerCase().trim(),
        status: { $in: ['pending', 'pending_delivery'] },
      })
      .lean()
      .exec() as any[];

    if (pending.length === 0) return;

    // Accept all pending invitations for this email
    await this.invitationModel.updateMany(
      { email: email.toLowerCase().trim(), status: { $in: ['pending', 'pending_delivery'] } },
      { $set: { status: 'accepted' } },
    );

    // Send welcome message for each company-scoped invitation
    const loginUrl = this.buildLoginUrl();
    for (const inv of pending) {
      if (inv.companyId && inv.invitationScope === 'company') {
        const companyName = await this.getCompanyName(inv.companyId).catch(() => '');
        await this.notifyCompanyWelcomeMessage({
          tenantCompanyId: inv.companyId,
          email:           inv.email,
          firstName:   inv.firstName,
          companyName,
          loginUrl,
          role:        inv.role,
        }).catch((err) =>
          this.logger.warn(
            `company_welcome_message failed for ${inv.email}: ${err?.message}`,
          ),
        );
      }
    }
  }

  // ── Private: company-name resolver ──────────────────────────────────────

  /**
   * Resolves the company display name to inject into the invitation email template.
   * - When companyId is provided → tenant company displayName.
   * - When companyId is null    → 'Grapifly' (modules context / platform_admin invite).
   */
  private async resolveInvitationCompanyName(companyId: string | null): Promise<string> {
    if (companyId) return this.getCompanyName(companyId);
    return 'Grapifly';
  }

  // ── Private: invitation event dispatcher ─────────────────────────────────

  /**
   * Routes ALL invitation-related events through the Platform Company (Grapifly).
   *
   * Routing table:
   *   platform_admin → platform_admin  →  security.platform_admin_invitation
   *   platform_admin → company_admin   →  security.company_admin_invitation
   *   company_owner/admin → any        →  security.company_user_invitation
   *
   * companyName travels as a template variable in payload.data; it never
   * determines which SMTP credentials are used.
   */
  private async dispatchInviteNotification(params: {
    actorRole:   UserRole;
    targetRole:  UserRole;
    companyId:   string;
    email:       string;
    firstName:   string;
    companyName: string;
    tempPassword:string;
    loginUrl:    string;
    role:        string;
  }): Promise<boolean> {
    if (params.actorRole === 'platform_admin' && params.targetRole === 'platform_admin') {
      return this.notifyPlatformAdminInvitation({
        tenantCompanyId: params.companyId,
        email:           params.email,
        firstName:       params.firstName,
        tempPassword:    params.tempPassword,
        loginUrl:        params.loginUrl,
        role:            params.role,
      });
    }

    if (params.actorRole === 'platform_admin' && params.targetRole === 'company_admin') {
      return this.notifyCompanyAdminInvitation({
        tenantCompanyId: params.companyId,
        email:           params.email,
        firstName:       params.firstName,
        companyName:     params.companyName,
        tempPassword:    params.tempPassword,
        loginUrl:        params.loginUrl,
        role:            params.role,
      });
    }

    return this.notifyCompanyUserInvitation({
      tenantCompanyId: params.companyId,
      email:           params.email,
      firstName:       params.firstName,
      companyName:     params.companyName,
      tempPassword:    params.tempPassword,
      loginUrl:        params.loginUrl,
      role:            params.role,
    });
  }

  // ── Private: per-event notification helpers ───────────────────────────────
  //
  // Each helper logs the tenant context (for debugging) then delegates to
  // firePlatformNotification(), which resolves platformCompanyId and fires.
  // No helper ever passes a tenant companyId to NotificationService.

  /** platform_admin → platform_admin  →  security.platform_admin_invitation */
  private async notifyPlatformAdminInvitation(params: {
    tenantCompanyId: string;
    email:           string;
    firstName:       string;
    tempPassword:    string;
    loginUrl:        string;
    role:            string;
  }): Promise<boolean> {
    this.logger.log(
      `[platform_admin_invitation] tenantCompanyId=${params.tenantCompanyId} recipient=${params.email}`,
    );
    return this.firePlatformNotification('security.platform_admin_invitation', params.email, {
      firstName:    params.firstName,
      email:        params.email,
      tempPassword: params.tempPassword,
      loginUrl:     params.loginUrl,
      role:         params.role,
    });
  }

  /** platform_admin → company_admin  →  security.company_admin_invitation */
  private async notifyCompanyAdminInvitation(params: {
    tenantCompanyId: string;
    email:           string;
    firstName:       string;
    companyName:     string;
    tempPassword:    string;
    loginUrl:        string;
    role:            string;
  }): Promise<boolean> {
    this.logger.log(
      `[company_admin_invitation] tenantCompanyId=${params.tenantCompanyId}` +
      ` companyName=${params.companyName} recipient=${params.email}`,
    );
    return this.firePlatformNotification('security.company_admin_invitation', params.email, {
      firstName:    params.firstName,
      email:        params.email,
      companyName:  params.companyName,
      tempPassword: params.tempPassword,
      loginUrl:     params.loginUrl,
      role:         params.role,
    });
  }

  /** company_owner/admin → any company role  →  security.company_user_invitation */
  private async notifyCompanyUserInvitation(params: {
    tenantCompanyId: string;
    email:           string;
    firstName:       string;
    companyName:     string;
    tempPassword:    string;
    loginUrl:        string;
    role:            string;
  }): Promise<boolean> {
    this.logger.log(
      `[company_user_invitation] tenantCompanyId=${params.tenantCompanyId}` +
      ` companyName=${params.companyName} recipient=${params.email}`,
    );
    return this.firePlatformNotification('security.company_user_invitation', params.email, {
      firstName:    params.firstName,
      email:        params.email,
      companyName:  params.companyName,
      tempPassword: params.tempPassword,
      loginUrl:     params.loginUrl,
      role:         params.role,
    });
  }

  /** Resend any invitation  →  security.company_invitation_resent */
  private async notifyInvitationResent(params: {
    tenantCompanyId: string;
    email:           string;
    firstName:       string;
    companyName:     string;
    tempPassword:    string;
    loginUrl:        string;
    role:            string;
  }): Promise<boolean> {
    this.logger.log(
      `[company_invitation_resent] tenantCompanyId=${params.tenantCompanyId}` +
      ` companyName=${params.companyName} recipient=${params.email}`,
    );
    return this.firePlatformNotification('security.company_invitation_resent', params.email, {
      firstName:    params.firstName,
      email:        params.email,
      companyName:  params.companyName,
      tempPassword: params.tempPassword,
      loginUrl:     params.loginUrl,
      role:         params.role,
    });
  }

  /** First-login completion for invited company users  →  security.company_welcome_message */
  private async notifyCompanyWelcomeMessage(params: {
    tenantCompanyId: string;
    email:           string;
    firstName:       string;
    companyName:     string;
    loginUrl:        string;
    role:            string;
  }): Promise<void> {
    this.logger.log(
      `[company_welcome_message] tenantCompanyId=${params.tenantCompanyId}` +
      ` companyName=${params.companyName} recipient=${params.email}`,
    );
    await this.firePlatformNotification('security.company_welcome_message', params.email, {
      firstName:   params.firstName,
      email:       params.email,
      companyName: params.companyName,
      loginUrl:    params.loginUrl,
      role:        params.role,
    });
  }

  // ── Private: modules-scoped send (mirrors AuthService.notifyVerifyEmail) ─

  /**
   * Resolves platformCompanyId and fires a notification through it.
   *
   * This is the single send path for every invitation event — identical in
   * structure to AuthService.notifyVerifyEmail():
   *   1. getPlatformCompanyId() → if null, warn and return false.
   *   2. fireNotification(platformCompanyId, ...)
   *
   * No invitation event ever reaches NotificationService with a tenant companyId.
   */
  private async firePlatformNotification(
    event: string,
    email: string,
    data:  Record<string, string>,
  ): Promise<boolean> {
    const platformCompanyId = await this.usersService.getPlatformCompanyId().catch(() => null);
    if (!platformCompanyId) {
      this.logger.warn(`[${event}] platform company not found — notification skipped for ${email}`);
      return false;
    }
    this.logger.log(`[${event}] platformCompanyId=${platformCompanyId} recipient=${email}`);
    return this.fireNotification(platformCompanyId, event, email, data);
  }

  /**
   * Thin wrapper around NotificationService.notifyEvent().
   * Returns true if at least one channel delivered successfully, false otherwise.
   * Logs delivery failures but never throws — callers decide how to handle the result.
   */
  private async fireNotification(
    companyId: string,
    event:     string,
    email:     string,
    data:      Record<string, string>,
  ): Promise<boolean> {
    try {
      const result: NotifyResult = await this.notificationService.notifyEvent({
        companyId,
        event,
        email,
        payload: { data },
      });
      const delivered = result.results.some((r) => r.success);
      if (!delivered) {
        const errors = result.results.map((r) => r.error).filter(Boolean).join('; ');
        this.logger.warn(`[${event}] notification did not deliver for ${email}: ${errors}`);
      }
      return delivered;
    } catch (err: any) {
      this.logger.warn(`[${event}] notification threw for ${email}: ${err?.message}`);
      return false;
    }
  }

  // ── Private: stale record maintenance ────────────────────────────────────

  private async expireStaleInvitations(): Promise<void> {
    await this.invitationModel.updateMany(
      {
        status:    { $in: ['pending', 'pending_delivery'] },
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: 'expired' } },
    );
  }

  private buildLoginUrl(): string {
    return (
      this.config.get<string>('APP_BASE_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '') + '/auth/login';
  }
}
