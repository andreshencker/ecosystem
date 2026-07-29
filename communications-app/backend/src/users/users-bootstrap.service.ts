import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import {
  Company,
  CompanyDocument,
} from '../communication/company/company-info/schemas/company.schema';
import { CompanyProvisioningService } from '../communication/company/provisioning/company-provisioning.service';

const BCRYPT_ROUNDS = 12;

/**
 * Runs once on application bootstrap — before the HTTP server accepts requests.
 *
 * Sequence (DEC-008 A3.7 / DEC-012 §13.1):
 *   1. Ensure the Grapifly modules company exists (isPlatformCompany: true).
 *   2. Ensure admin@grapifly.com exists with companyId pointing to that company.
 *      — If the user already exists with a stale/null companyId, patch it.
 *
 * Fully idempotent: safe to run on every restart.
 *
 * Configuration (env vars, all optional):
 *   PLATFORM_ADMIN_BOOTSTRAP_EMAIL    (default: admin@grapifly.com)
 *   PLATFORM_ADMIN_BOOTSTRAP_PASSWORD (default: @Grapifly1)
 */
@Injectable()
export class UsersBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersBootstrapService.name);

  private static readonly BOOTSTRAP_EMAIL =
    process.env['PLATFORM_ADMIN_BOOTSTRAP_EMAIL'] ?? 'admin@grapifly.com';

  private static readonly BOOTSTRAP_PASSWORD =
    process.env['PLATFORM_ADMIN_BOOTSTRAP_PASSWORD'] ?? '@Grapifly1';

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    private readonly provisioning: CompanyProvisioningService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const platformCompany = await this.ensurePlatformCompany();
      await this.ensurePlatformAdmin(platformCompany);
      await this.ensurePlatformCompanyProvisioned(String(platformCompany._id));
      await this.cleanupTenantCatalogues();
      await this.ensureInvoiceAppSecurityEvents();
    } catch (err: any) {
      this.logger.error(`Bootstrap failed: ${err?.message}`, err?.stack);
    }
  }

  // ─── Phase 1: modules company ─────────────────────────────────────────────

  private async ensurePlatformCompany(): Promise<CompanyDocument> {
    const existing = await this.companyModel
      .findOne({ isPlatformCompany: true })
      .exec();

    if (existing) {
      this.logger.log(
        `Bootstrap: platform company already exists (key=${existing.companyKey}, id=${existing._id}) — no action taken.`,
      );
      return existing;
    }

    const created = await this.companyModel.create({
      companyKey: 'grapifly',
      displayName: 'Grapifly',
      isActive: true,
      isPlatformCompany: true,
    });

    this.logger.log(
      `Bootstrap: created platform company (key=grapifly, id=${created._id}).`,
    );
    return created;
  }

  // ─── Phase 2: modules admin ────────────────────────────────────────────────

  private async ensurePlatformAdmin(
    platformCompany: CompanyDocument,
  ): Promise<void> {
    const email = UsersBootstrapService.BOOTSTRAP_EMAIL;
    const correctCompanyId = String(platformCompany._id);
    const correctCompanyKey = platformCompany.companyKey;

    const existing = await this.userModel.findOne({ email }).exec();

    if (!existing) {
      const passwordHash = await bcrypt.hash(
        UsersBootstrapService.BOOTSTRAP_PASSWORD,
        BCRYPT_ROUNDS,
      );

      await this.userModel.create({
        email,
        passwordHash,
        firstName: 'Platform',
        lastName: 'Admin',
        role: 'platform_admin',
        scope: 'global',
        companyId: correctCompanyId,
        companyKey: correctCompanyKey,
        isActive: true,
        isEmailVerified: true,
      });

      this.logger.log(
        `Bootstrap: created platform_admin user (${email}, companyId=${correctCompanyId}).`,
      );
      return;
    }

    // User exists — check whether companyId is already correct.
    if (
      existing.companyId === correctCompanyId &&
      existing.companyKey === correctCompanyKey
    ) {
      this.logger.log(
        `Bootstrap: platform_admin already correctly linked (${email}, companyId=${correctCompanyId}) — no action taken.`,
      );
      return;
    }

    // Patch stale record (null or wrong companyId from pre-A3 bootstrap).
    await this.userModel.updateOne(
      { _id: existing._id },
      { $set: { companyId: correctCompanyId, companyKey: correctCompanyKey } },
    );

    this.logger.log(
      `Bootstrap: patched platform_admin companyId (${email}: ${existing.companyId ?? 'null'} → ${correctCompanyId}).`,
    );
  }

  // ─── Phase 3: modules company provisioning ────────────────────────────────

  /**
   * Ensures the modules company has all default communication assets provisioned.
   * Idempotent — safe to run on every restart. Adds any missing assets introduced
   * by DEFAULT_COMPANY_EVENTS updates (e.g. company_verify_email) without touching
   * existing ones (DEC-017 §21.1 idempotency rule).
   */
  private async ensurePlatformCompanyProvisioned(
    companyId: string,
  ): Promise<void> {
    const report = await this.provisioning.provisionCompany(companyId, {
      isPlatformCompany: true,
    });
    if (report.errors.length > 0) {
      this.logger.warn(
        `Bootstrap: platform company provisioning had errors — ${JSON.stringify(report.errors)}`,
      );
    } else {
      const created = report.created.events;
      if (created.length > 0) {
        this.logger.log(
          `Bootstrap: platform company provisioning created events: [${created.join(', ')}]`,
        );
      } else {
        this.logger.log(
          'Bootstrap: modules company provisioning — all assets already present.',
        );
      }
    }
  }

  // ─── Phase 4: Remove tenant domains and events ────────────────────────────

  /**
   * Idempotent cleanup: removes domain_catalogue and event_catalogue records
   * that belong to tenant companies (created before the provisioning architecture
   * refactor). Safe to run on every restart — no-ops when already clean.
   */
  private async cleanupTenantCatalogues(): Promise<void> {
    const { deletedDomains, deletedEvents } =
      await this.provisioning.cleanupTenantCatalogues();

    if (deletedDomains > 0 || deletedEvents > 0) {
      this.logger.log(
        `Bootstrap: tenant catalogue cleanup removed ${deletedDomains} domain(s) and ${deletedEvents} event(s).`,
      );
    } else {
      this.logger.log(
        'Bootstrap: tenant catalogues already clean — no action taken.',
      );
    }
  }

  // ─── Phase 5: Tenant security events ──────────────────────────────────────

  /**
   * Ensures the 'invoice-app' tenant company has its security domain and all
   * company-scoped security events provisioned.  Idempotent — runs on every
   * restart; no-ops when everything is already present.
   */
  private async ensureInvoiceAppSecurityEvents(): Promise<void> {
    const company = (await this.companyModel
      .findOne({ companyKey: 'invoice-app' })
      .select('_id displayName')
      .lean()) as any;

    if (!company) {
      this.logger.log(
        'Bootstrap: invoice-app company not found — skipping tenant security events.',
      );
      return;
    }

    const report = await this.provisioning.provisionTenantSecurityEvents(
      String(company._id),
    );

    if (report.errors.length > 0) {
      this.logger.warn(
        `Bootstrap: invoice-app security provisioning had errors — ${JSON.stringify(report.errors)}`,
      );
    }

    if (report.created.events.length > 0) {
      this.logger.log(
        `Bootstrap: invoice-app security events created: [${report.created.events.join(', ')}]`,
      );
    } else {
      this.logger.log(
        'Bootstrap: invoice-app security events — all already present.',
      );
    }
  }
}
