import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from './schemas/ecosystem-user.schema';
import type { UserRole, UserScope } from './schemas/ecosystem-user.schema';
import type { GrapiflyRelaySsoContract } from '../contracts/grapifly-ecosystem.contract';
import {
  Company,
  CompanyDocument,
} from '../../communication/company/company-info/schemas/company.schema';

@Injectable()
export class EcosystemIdentityService {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    private readonly config: ConfigService,
  ) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<UserDocument | null> {
    return this.model.findById(id).select('-passwordHash').lean().exec() as any;
  }

  async findByIdOrThrow(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async linkGrapiflyIdentity(identity: {
    grapiflyUserId: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    avatarUrl: string | null;
  }, context?: {
    companyId: string;
    companyKey: string;
    role: UserRole;
    scope: UserScope;
  }): Promise<UserDocument> {
    if (!identity.emailVerified) {
      throw new UnauthorizedException('Grapifly email is not verified');
    }
    const alreadyLinked = await this.model
      .findOne({ grapiflyUserId: identity.grapiflyUserId })
      .lean()
      .exec();
    if (alreadyLinked) return alreadyLinked as any;

    const email = identity.email.toLowerCase().trim();
    let user = await this.model.findOne({ email }).lean().exec();
    if (!user) {
      if (!context) return this.provisionGrapiflyPlatformAdmin(identity);
      const parts = identity.displayName.trim().split(/\s+/).filter(Boolean);
      const firstName = parts.shift() ?? 'Grapifly';
      const lastName = parts.join(' ') || 'User';
      return this.model.create({
        grapiflyUserId: identity.grapiflyUserId,
        identityProvider: 'grapifly',
        grapiflyLinkedAt: new Date(),
        email,
        passwordHash: null,
        firstName,
        lastName,
        avatarUrl: identity.avatarUrl,
        role: context.role,
        scope: context.scope,
        companyId: context.companyId,
        companyKey: context.companyKey,
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: false,
      }) as any;
    }
    if (!user.isActive) throw new UnauthorizedException('Relay account is inactive');

    try {
      const linked = await this.model.findOneAndUpdate(
        { _id: user._id, grapiflyUserId: null },
        {
          $set: {
            grapiflyUserId: identity.grapiflyUserId,
            identityProvider: 'grapifly',
            grapiflyLinkedAt: new Date(),
            isEmailVerified: true,
            ...(identity.avatarUrl && !user.avatarUrl ? { avatarUrl: identity.avatarUrl } : {}),
          },
        },
        { new: true },
      ).lean();
      if (!linked) throw new ConflictException('Relay account is already linked to another Grapifly ID');
      return linked as any;
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('Grapifly ID is already linked');
      throw error;
    }
  }

  async resolveGrapiflyCompany(identity: GrapiflyRelaySsoContract): Promise<CompanyDocument> {
    const direct = await this.companyModel.findOne({
      grapiflyOrganizationId: identity.organization.organizationId,
      isActive: true,
    }).lean().exec();
    if (direct) return direct as any;

    const existingUser = await this.model.findOne({
      $or: [
        { grapiflyUserId: identity.grapiflyUserId },
        { email: identity.email.toLowerCase().trim() },
      ],
    }).lean().exec();
    if (existingUser?.companyId) {
      const claimed = await this.companyModel.findOneAndUpdate(
        {
          _id: existingUser.companyId,
          $or: [
            { grapiflyOrganizationId: null },
            { grapiflyOrganizationId: { $exists: false } },
            { grapiflyOrganizationId: identity.organization.organizationId },
          ],
        },
        { $set: { grapiflyOrganizationId: identity.organization.organizationId } },
        { new: true },
      ).lean().exec();
      if (claimed) return claimed as any;
    }

    if (identity.organization.isPlatform) {
      const platform = await this.companyModel.findOneAndUpdate(
        { isPlatformCompany: true, isActive: true },
        { $set: { grapiflyOrganizationId: identity.organization.organizationId } },
        { new: true },
      ).lean().exec();
      if (platform) return platform as any;
    }

    let companyKey = this.slugify(identity.organization.slug || identity.organization.name);
    if (!companyKey) companyKey = `grapifly-${identity.organization.organizationId.slice(-8).toLowerCase()}`;
    const collision = await this.companyModel.exists({ companyKey });
    if (collision) companyKey = `${companyKey}-${identity.organization.organizationId.slice(-6).toLowerCase()}`;
    return this.companyModel.create({
      grapiflyOrganizationId: identity.organization.organizationId,
      companyKey,
      displayName: identity.organization.name,
      isActive: true,
      isPlatformCompany: false,
    }) as any;
  }

  private async provisionGrapiflyPlatformAdmin(identity: {
    grapiflyUserId: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    avatarUrl: string | null;
  }): Promise<any> {
    const allowedEmail = (
      this.config.get<string>('GRAPIFLY_PLATFORM_ADMIN_EMAIL') ??
      'grapiflydeveloper@gmail.com'
    )
      .toLowerCase()
      .trim();
    const email = identity.email.toLowerCase().trim();
    if (email !== allowedEmail) {
      throw new UnauthorizedException(
        'Relay access has not been provisioned for this Grapifly account',
      );
    }

    const platformCompany = await this.companyModel
      .findOne({ isPlatformCompany: true, isActive: true })
      .lean()
      .exec();
    if (!platformCompany) {
      throw new UnauthorizedException('Relay platform context is unavailable');
    }

    const parts = identity.displayName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts.shift() ?? 'Grapifly';
    const lastName = parts.join(' ') || 'Administrator';
    try {
      return await this.model.create({
        grapiflyUserId: identity.grapiflyUserId,
        identityProvider: 'grapifly',
        grapiflyLinkedAt: new Date(),
        email,
        passwordHash: null,
        firstName,
        lastName,
        avatarUrl: identity.avatarUrl,
        role: 'platform_admin',
        scope: 'global',
        companyId: String(platformCompany._id),
        companyKey: platformCompany.companyKey,
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: false,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        const existing = await this.model.findOne({ email }).lean().exec();
        if (existing) return existing;
      }
      throw error;
    }
  }

  /**
   * Returns the ObjectId string of the modules company (isPlatformCompany: true).
   * Used to route the email verification notification through the modules's own
   * credentials when a new company has not yet configured its own delivery channel.
   */
  async getPlatformCompanyId(): Promise<string | null> {
    const company = await this.companyModel
      .findOne({ isPlatformCompany: true })
      .select('_id')
      .lean()
      .exec();
    return company ? String(company._id) : null;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
