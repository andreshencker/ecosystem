import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import type { UserRole, UserScope } from './schemas/user.schema';
import {
  Company,
  CompanyDocument,
} from '../communication/company/company-info/schemas/company.schema';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
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

  /**
   * Returns the user WITH passwordHash — for login validation only.
   * Never pass the result of this method to an API response.
   */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.model
      .findOne({ email: email.toLowerCase().trim() })
      .lean()
      .exec() as any;
  }

  async linkGrapiflyIdentity(identity: {
    grapiflyUserId: string;
    email: string;
    emailVerified: boolean;
    avatarUrl: string | null;
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
    const user = await this.model.findOne({ email }).lean().exec();
    if (!user) {
      throw new UnauthorizedException(
        'Relay access has not been provisioned for this Grapifly account',
      );
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

  /** Returns true if any user document matches the given email (case-insensitive). */
  async existsByEmail(email: string): Promise<boolean> {
    const doc = await this.model
      .findOne({ email: email.toLowerCase().trim() })
      .select('_id')
      .lean()
      .exec();
    return !!doc;
  }

  async findByEmailVerificationToken(
    tokenHash: string,
  ): Promise<UserDocument | null> {
    return this.model
      .findOne({
        emailVerificationToken: tokenHash,
        emailVerificationTokenExpiresAt: { $gt: new Date() },
      })
      .lean()
      .exec() as any;
  }

  async findByPasswordResetToken(
    tokenHash: string,
  ): Promise<UserDocument | null> {
    return this.model
      .findOne({
        passwordResetToken: tokenHash,
        passwordResetTokenExpiresAt: { $gt: new Date() },
      })
      .lean()
      .exec() as any;
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<UserDocument> {
    try {
      const created = await this.model.create({
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });
      return created.toObject() as any;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw err;
    }
  }

  async setEmailVerified(userId: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });
  }

  async setEmailVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: {
        emailVerificationToken: tokenHash,
        emailVerificationTokenExpiresAt: expiresAt,
      },
    });
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: {
        passwordResetToken: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      },
    });
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });
  }

  // ── Invited-user creation (called by UserInvitationsController) ─────────────

  /**
   * Creates a user account directly (DEC-013).
   * Sets mustChangePassword=true and generates a secure temporary password.
   * Returns the user document and the plaintext tempPassword for email delivery.
   * Called by UserInvitationsController — user creation is a user responsibility.
   */
  async createInvitedUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    companyId: string | null;
    companyKey: string | null;
  }): Promise<{ user: UserDocument; tempPassword: string }> {
    const existing = await this.model
      .findOne({ email: params.email.toLowerCase().trim() })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    const scope: UserScope =
      params.role === 'platform_admin' ? 'global' : 'company';

    const user = await this.model.create({
      email: params.email.toLowerCase().trim(),
      passwordHash,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      role: params.role,
      scope,
      companyId: params.companyId,
      companyKey: params.companyKey,
      isActive: true,
      isEmailVerified: true, // invited users login immediately; no email-verification step
      mustChangePassword: true,
      temporaryPasswordCreatedAt: new Date(),
      temporaryPasswordExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });

    return { user: user.toObject() as any, tempPassword };
  }

  /**
   * Refreshes the temporary password for an already-invited user.
   * Called by UserInvitationsService.resendInvitation — password state is a user responsibility.
   */
  async refreshTemporaryPassword(userId: string): Promise<string> {
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    await this.model.findByIdAndUpdate(userId, {
      $set: {
        passwordHash,
        mustChangePassword: true,
        temporaryPasswordCreatedAt: new Date(),
        temporaryPasswordExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    return tempPassword;
  }

  // ── Activate / deactivate ─────────────────────────────────────────────────

  /**
   * Activates or deactivates a user account.
   * Permission checks (who can deactivate whom) are enforced in the controller.
   */
  async setUserActive(
    userId: string,
    isActive: boolean,
  ): Promise<UserDocument> {
    const updated = await this.model
      .findByIdAndUpdate(userId, { $set: { isActive } }, { new: true })
      .select(
        '-passwordHash -emailVerificationToken -emailVerificationTokenExpiresAt' +
          ' -passwordResetToken -passwordResetTokenExpiresAt',
      )
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('User not found');
    return updated as any;
  }

  // ── List ──────────────────────────────────────────────────────────────────

  /** Returns platform_admin and company_owner users across all companies (global scope listing). */
  async listPlatformUsers(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{
    items: UserDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const roleFilter = { $in: ['platform_admin', 'company_owner'] };
    const filter: Record<string, any> = { role: roleFilter };
    if (params.search?.trim()) {
      const re = new RegExp(params.search.trim(), 'i');
      filter['$and'] = [
        { role: roleFilter },
        { $or: [{ email: re }, { firstName: re }, { lastName: re }] },
      ];
      delete filter['role'];
    }
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .select(
          '-passwordHash -emailVerificationToken -emailVerificationTokenExpiresAt -passwordResetToken -passwordResetTokenExpiresAt',
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter),
    ]);
    return {
      items: items as any[],
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async listByCompanyId(
    companyId: string,
    params: { page: number; limit: number; search?: string },
  ): Promise<{
    items: UserDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: Record<string, any> = { companyId };
    if (params.search?.trim()) {
      const re = new RegExp(params.search.trim(), 'i');
      filter['$or'] = [{ email: re }, { firstName: re }, { lastName: re }];
    }
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .select(
          '-passwordHash -emailVerificationToken -emailVerificationTokenExpiresAt -passwordResetToken -passwordResetTokenExpiresAt',
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter),
    ]);
    return {
      items: items as any[],
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(
    userId: string,
    data: { firstName?: string; lastName?: string; avatarUrl?: string | null },
  ): Promise<UserDocument> {
    const $set: any = {};
    if (data.firstName !== undefined) $set.firstName = data.firstName.trim();
    if (data.lastName !== undefined) $set.lastName = data.lastName.trim();
    if (data.avatarUrl !== undefined)
      $set.avatarUrl = data.avatarUrl?.trim() || null;

    const updated = await this.model
      .findByIdAndUpdate(userId, { $set }, { new: true })
      .select('-passwordHash')
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('User not found');
    return updated as any;
  }

  /** Changes the user's password and clears mustChangePassword (DEC-014 G-DEC014-002). */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<UserDocument> {
    const user = (await this.model.findById(userId).lean().exec()) as any;
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException('Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updated = await this.model
      .findByIdAndUpdate(
        userId,
        { $set: { passwordHash: hash, mustChangePassword: false } },
        { new: true },
      )
      .select(
        '-passwordHash -emailVerificationToken -emailVerificationTokenExpiresAt -passwordResetToken -passwordResetTokenExpiresAt',
      )
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('User not found');
    return updated as any;
  }

  async deleteById(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('User not found');
  }

  /** Returns the count of active company_owner users for a given companyId. */
  async countActiveOwners(companyId: string): Promise<number> {
    return this.model
      .countDocuments({
        companyId,
        role: 'company_owner',
        isActive: { $ne: false },
      })
      .exec() as any;
  }

  // ── Registration (Flow A — DEC-009 Rev-2) ──────────────────────────────────

  /**
   * Creates a Company and a company_owner user atomically (compensating rollback).
   * Phase 1 of the two-phase registration model (DEC-017 §3):
   *   - If the user already exists → 409 (company is never created)
   *   - If the company key conflicts → 409 (email check already passed)
   *   - If user creation fails after company is created → company is deleted (rollback)
   * Returns the created company and user documents.
   */
  async createCompanyOwnerWithCompany(params: {
    companyName: string;
    companyEmail?: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<{ company: CompanyDocument; user: UserDocument }> {
    const email = params.email.toLowerCase().trim();

    // Check email uniqueness before touching the company collection.
    const existingUser = await this.model.findOne({ email }).lean().exec();
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const companyKey = this.slugify(params.companyName);
    if (!companyKey) {
      throw new BadRequestException(
        'companyName must contain at least one alphanumeric character',
      );
    }

    // Create Company (Phase 1 of transaction).
    let company: CompanyDocument;
    try {
      company = await this.companyModel.create({
        companyKey,
        displayName: params.companyName.trim(),
        companyEmail:
          params.companyEmail?.toLowerCase().trim() ||
          params.email.toLowerCase().trim(),
        isActive: true,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(
          `A company with the name "${params.companyName}" already exists. Please choose a different name.`,
        );
      }
      throw err;
    }

    const companyId = String(company._id);

    // Create User (Phase 1 of transaction). Rollback company on failure.
    let user: UserDocument;
    try {
      user = await this.model.create({
        email,
        passwordHash: params.passwordHash,
        firstName: params.firstName.trim(),
        lastName: params.lastName.trim(),
        role: 'company_owner' as UserRole,
        scope: 'company' as UserScope,
        companyId,
        companyKey,
        isActive: true,
        isEmailVerified: false,
        mustChangePassword: false,
      });
    } catch (err: any) {
      // Compensating rollback — remove the company if user creation fails.
      await this.companyModel
        .findByIdAndDelete(company._id)
        .exec()
        .catch(() => void 0);
      if (err?.code === 11000) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw err;
    }

    // Link ownerUserId on the company (best-effort; non-fatal if it fails).
    await this.companyModel
      .findByIdAndUpdate(company._id, {
        $set: { ownerUserId: String(user._id) },
      })
      .exec()
      .catch(() => void 0);

    return {
      company: company.toObject() as any,
      user: user.toObject() as any,
    };
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

  /**
   * Returns the displayName of a company by its ObjectId string.
   * Falls back to the companyId string itself when the company cannot be found.
   * Used by notification helpers that need to pass data.companyName in the payload.
   */
  async getCompanyDisplayName(companyId: string): Promise<string> {
    try {
      if (!companyId) return companyId;
      const doc = (await this.companyModel
        .findById(companyId)
        .select('displayName')
        .lean()
        .exec()) as any;
      return doc?.displayName ?? companyId;
    } catch {
      return companyId;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private generateTempPassword(): string {
    const charset =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    const bytes = randomBytes(16);
    return Array.from(bytes, (b) => charset[b % charset.length]).join('');
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
