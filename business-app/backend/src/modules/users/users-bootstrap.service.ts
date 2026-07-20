import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import {
  Business,
  BusinessDocument,
} from '../business/schemas/business.schema';

const BCRYPT_ROUNDS = 12;

/**
 * Runs once on application bootstrap — before the HTTP server accepts requests.
 *
 * Sequence:
 *   1. Ensure the platform company exists (isPlatformCompany: true).
 *   2. Ensure the platform admin user exists and is correctly linked.
 *      — Creates the user if absent.
 *      — Repairs stale companyId / role / scope / businessKey if drifted.
 *      — Resets the passwordHash ONLY if it is null or not a valid bcrypt hash
 *        (never overwrites a valid existing hash on normal restarts).
 *   3. Repair any company-scoped users whose companyId points to a deleted Business.
 *
 * Fully idempotent: safe to run on every restart.
 * Never logs plaintext passwords, tokens, or hashes.
 *
 * Configuration (env vars, all optional):
 *   PLATFORM_ADMIN_BOOTSTRAP_EMAIL    (default: admin@invoiceapp.com)
 *   PLATFORM_ADMIN_BOOTSTRAP_PASSWORD (default: InvoiceApp123!)
 */
@Injectable()
export class UsersBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersBootstrapService.name);

  private static readonly BOOTSTRAP_EMAIL =
    process.env['PLATFORM_ADMIN_BOOTSTRAP_EMAIL'] ?? 'admin@invoiceapp.com';

  private static readonly BOOTSTRAP_PASSWORD =
    process.env['PLATFORM_ADMIN_BOOTSTRAP_PASSWORD'] ?? 'InvoiceApp123!';

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Business.name)
    private readonly companyModel: Model<BusinessDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const platformCompany = await this.ensurePlatformCompany();
      await this.ensurePlatformAdmin(platformCompany);
      await this.repairOrphanedBusinessUsers();
      this.logBootstrapSummary();
    } catch (err: any) {
      this.logger.error(`Bootstrap failed: ${err?.message}`, err?.stack);
    }
  }

  // ─── Phase 1: platform company ────────────────────────────────────────────

  private async ensurePlatformCompany(): Promise<BusinessDocument> {
    const existing = await this.companyModel
      .findOne({ isPlatformCompany: true })
      .exec();

    if (existing) {
      this.logger.log(
        `Bootstrap: platform company — result: already exists (key=${existing.businessKey}, id=${existing._id})`,
      );
      return existing;
    }

    const created = await this.companyModel.create({
      businessKey: 'invoice-app',
      businessName: 'Invoice App',
      isActive: true,
      isPlatformCompany: true,
    });

    this.logger.log(
      `Bootstrap: platform company — result: created (key=invoice-app, id=${created._id})`,
    );
    return created;
  }

  // ─── Phase 2: platform admin ──────────────────────────────────────────────

  private async ensurePlatformAdmin(
    platformCompany: BusinessDocument,
  ): Promise<void> {
    const email = UsersBootstrapService.BOOTSTRAP_EMAIL;
    const correctCompanyId = String(platformCompany._id);
    const correctBusinessKey = platformCompany.businessKey;

    const existing = await this.userModel.findOne({ email }).exec();

    if (!existing) {
      const passwordHash = await bcrypt.hash(
        UsersBootstrapService.BOOTSTRAP_PASSWORD,
        BCRYPT_ROUNDS,
      );

      const created = await this.userModel.create({
        email,
        passwordHash,
        firstName: 'Platform',
        lastName: 'Admin',
        role: 'platform_admin',
        scope: 'global',
        companyId: correctCompanyId,
        businessKey: correctBusinessKey,
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: false,
      });

      this.logger.log(
        `Bootstrap: platform_admin (${email}) — result: created (id=${created._id}, companyId=${correctCompanyId})`,
      );
      return;
    }

    const $set: Record<string, any> = {};
    const repairs: string[] = [];

    if (String(existing.companyId) !== correctCompanyId) {
      $set.companyId = correctCompanyId;
      repairs.push('companyId');
    }
    if (existing.businessKey !== correctBusinessKey) {
      $set.businessKey = correctBusinessKey;
      repairs.push('businessKey');
    }
    if (existing.role !== 'platform_admin') {
      $set.role = 'platform_admin';
      repairs.push('role');
    }
    if (existing.scope !== 'global') {
      $set.scope = 'global';
      repairs.push('scope');
    }

    // Repair password hash only if it is null or not a valid bcrypt hash.
    // A valid hash always starts with "$2" (bcrypt format).
    // We never overwrite a valid existing hash — users may have changed their password.
    const pw = (existing as any).passwordHash;
    const hashIsValid = typeof pw === 'string' && pw.startsWith('$2');
    if (!hashIsValid) {
      $set.passwordHash = await bcrypt.hash(
        UsersBootstrapService.BOOTSTRAP_PASSWORD,
        BCRYPT_ROUNDS,
      );
      repairs.push('passwordHash (was missing or invalid — reset to bootstrap default)');
    }

    if (Object.keys($set).length === 0) {
      this.logger.log(
        `Bootstrap: platform_admin (${email}) — result: already correct, no changes`,
      );
      return;
    }

    await this.userModel.updateOne({ _id: existing._id }, { $set });

    this.logger.log(
      `Bootstrap: platform_admin (${email}) — result: repaired [${repairs.join(', ')}]`,
    );
  }

  // ─── Phase 3: repair orphaned business-scoped users ───────────────────────
  //
  // A company-scoped user whose companyId points to a non-existent Business
  // document cannot load /settings/company (the backend returns 404).
  // This can happen when the database is partially reset (users collection
  // persists but the businesses collection is wiped).
  //
  // For each affected user: create a placeholder Business and update the user.
  // Idempotent: skips users whose companyId already resolves to a document.

  private async repairOrphanedBusinessUsers(): Promise<void> {
    const companyUsers = await this.userModel
      .find({ scope: 'company', companyId: { $ne: null } })
      .lean()
      .exec();

    let repaired = 0;
    let healthy = 0;

    for (const user of companyUsers) {
      const companyId = user.companyId ? String(user.companyId) : null;
      if (!companyId) continue;

      const exists = await this.companyModel.findById(companyId).lean().exec();
      if (exists) {
        healthy++;
        continue;
      }

      const rawName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
      const businessName = rawName
        ? `${rawName}'s Business`
        : `${user.email}'s Business`;
      let businessKey = this.slugify(rawName || user.email);

      const conflict = await this.companyModel
        .findOne({ businessKey })
        .lean()
        .exec();
      if (conflict) businessKey = `${businessKey}-${String(user._id).slice(-4)}`;

      const newCompany = await this.companyModel.create({
        businessKey,
        businessName,
        ownerUserId: String(user._id),
        depositAccount: { bsb: null, accountNumber: null },
        defaultCurrency: 'AUD',
        isActive: true,
        isPlatformCompany: false,
      });

      await this.userModel.updateOne(
        { _id: user._id },
        { $set: { companyId: String(newCompany._id), businessKey } },
      );

      this.logger.log(
        `Bootstrap: repaired orphaned user ${user.email} — created placeholder Business ` +
          `"${businessName}" (id=${newCompany._id}, key=${businessKey})`,
      );
      repaired++;
    }

    if (repaired > 0 || healthy > 0) {
      this.logger.log(
        `Bootstrap: company-scoped users — healthy=${healthy} repaired=${repaired}`,
      );
    }
  }

  // ─── Summary log ──────────────────────────────────────────────────────────
  // Never logs passwords, hashes, tokens, or secrets.

  private logBootstrapSummary(): void {
    this.logger.log(
      `Bootstrap: complete — admin email: ${UsersBootstrapService.BOOTSTRAP_EMAIL}` +
        ` (set PLATFORM_ADMIN_BOOTSTRAP_EMAIL / PLATFORM_ADMIN_BOOTSTRAP_PASSWORD to override)`,
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

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
