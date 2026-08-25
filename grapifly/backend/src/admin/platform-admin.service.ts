import { BadRequestException, ForbiddenException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { PlatformAdmin, PlatformAdminDocument } from './schemas/platform-admin.schema';
import { AdminInvitation, AdminInvitationDocument } from './schemas/admin-invitation.schema';
import { GrapiflyUser, GrapiflyUserDocument } from '../users/schemas/user.schema';
import { RoleCatalogService } from '../roles/role-catalog.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { RelayNotificationService } from '../relay-notifications/relay-notification.service';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class PlatformAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(
    @InjectModel(PlatformAdmin.name) private readonly admins: Model<PlatformAdminDocument>,
    @InjectModel(AdminInvitation.name) private readonly invitations: Model<AdminInvitationDocument>,
    @InjectModel(GrapiflyUser.name) private readonly users: Model<GrapiflyUserDocument>,
    private readonly usersService: UsersService,
    private readonly roleCatalog: RoleCatalogService,
    private readonly config: ConfigService,
    private readonly organizations: OrganizationsService,
    private readonly relayNotifications: RelayNotificationService,
  ) {}

  async onApplicationBootstrap() {
    const email = (this.config.get<string>('ECOSYSTEM_SUPER_ADMIN_EMAIL') ?? 'grapiflydeveloper@gmail.com').toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Super admin seed pending: ${email} must sign in to Grapifly first.`);
      return;
    }
    await this.admins.findOneAndUpdate(
      { email },
      { $set: { grapiflyUserId: user.grapiflyUserId, role: 'ecosystem_super_admin', status: 'active' }, $setOnInsert: { email } },
      { upsert: true, returnDocument: 'after' },
    );
    // This person's real nature is 'interno', even though the account was
    // first created via a normal Google sign-in before being flagged here.
    await this.users.updateOne({ grapiflyUserId: user.grapiflyUserId }, { $set: { tipo: 'interno' } });
    this.logger.log(`Platform admin ready: ${email} (ecosystem_super_admin).`);
  }

  async requireActiveAdmin(grapiflyUserId: string) {
    const admin = await this.admins.findOne({ grapiflyUserId, status: 'active' }).lean();
    if (!admin) throw new ForbiddenException('Grapifly administration access is required');
    return admin;
  }

  async requireSuperAdmin(grapiflyUserId: string) {
    const admin = await this.requireActiveAdmin(grapiflyUserId);
    if (admin.role !== 'ecosystem_super_admin') throw new ForbiddenException('Ecosystem super admin access is required');
    return admin;
  }

  listAdmins() {
    return this.admins.find().sort({ createdAt: 1 }).lean();
  }

  async listInvitations(actorUserId: string) {
    await this.requireActiveAdmin(actorUserId);
    await this.expirePending();
    return this.invitations.find({ status: { $in: ['pending', 'expired'] } }).select('-tokenHash').sort({ createdAt: -1 }).lean();
  }

  /**
   * Only an active super admin can invite new admins — the one entry point
   * into the ecosystem's "interno" world besides the bootstrap seed above.
   */
  async invite(actorUserId: string, email: string, level: string) {
    await this.requireSuperAdmin(actorUserId);
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new BadRequestException('A valid email is required');
    if (!(await this.roleCatalog.isValidRole('internal', level))) {
      const validLevels = await this.roleCatalog.rolesForFlow('internal');
      throw new BadRequestException(`Invalid admin level — must be one of: ${validLevels.join(', ')}`);
    }
    await this.invitations.updateMany({ email: normalizedEmail, status: 'pending' }, { $set: { status: 'cancelled' } });
    const token = randomBytes(32).toString('base64url');
    const invitation = await this.invitations.create({
      invitationId: `gpf_adm_inv_${randomBytes(12).toString('hex')}`,
      email: normalizedEmail,
      level,
      tokenHash: this.hash(token),
      invitedBy: actorUserId,
      status: 'pending',
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      acceptedAt: null,
    });

    const platformOrganization = await this.organizations.findPlatformOrganizationSummary();
    if (platformOrganization) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100';
      this.relayNotifications
        .sendEvent({
          organizationId: platformOrganization.organizationId,
          organizationName: platformOrganization.name,
          event: 'grapifly_admin_invitation',
          email: normalizedEmail,
          payload: {
            invitationUrl: `${frontendUrl}/admin-invitations/${token}`,
            level,
          },
        })
        .catch(() => {});
    }

    return { invitation: { ...invitation.toObject(), tokenHash: undefined }, token };
  }

  async cancelInvitation(actorUserId: string, invitationId: string) {
    await this.requireSuperAdmin(actorUserId);
    const invitation = await this.invitations.findOneAndUpdate(
      { invitationId, status: 'pending' },
      { $set: { status: 'cancelled' } },
      { returnDocument: 'after' },
    ).lean();
    if (!invitation) throw new BadRequestException('Pending invitation not found');
    return { invitationId, status: 'cancelled' };
  }

  /** Anyone with a valid Grapifly session can accept — the token+email match is the real gate. */
  async acceptInvitation(grapiflyUserId: string, token: string) {
    const user = await this.usersService.findByGrapiflyUserId(grapiflyUserId);
    if (!user) throw new ForbiddenException('Active Grapifly identity required');
    const invitation = await this.invitations.findOne({ tokenHash: this.hash(token), status: 'pending' }).select('+tokenHash');
    if (!invitation || invitation.expiresAt <= new Date()) throw new BadRequestException('Invitation is invalid or expired');
    if (invitation.email !== user.email.toLowerCase()) throw new ForbiddenException('This invitation belongs to another email address');
    await this.admins.findOneAndUpdate(
      { email: invitation.email },
      { $set: { grapiflyUserId, role: invitation.level, status: 'active' } },
      { upsert: true, returnDocument: 'after' },
    );
    await this.users.updateOne({ grapiflyUserId }, { $set: { tipo: 'interno' } });
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();
    return { level: invitation.level };
  }

  private async expirePending() {
    await this.invitations.updateMany({ status: 'pending', expiresAt: { $lte: new Date() } }, { $set: { status: 'expired' } });
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
