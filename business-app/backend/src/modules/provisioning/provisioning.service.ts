import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Business,
  BusinessDocument,
} from '../business/schemas/business.schema';

/**
 * ProvisioningService — Phase 2 of business registration (async, non-atomic).
 *
 * Called fire-and-forget after Phase 1 (Company + Owner creation) completes.
 * Each step is idempotent: re-running on the same companyId is always safe.
 *
 * Sprint 1 scope:
 *   P-03 FiscalProfile   → Company schema already provides AUD defaults on creation. ✅
 *   P-14 ChartOfAccounts → Module pending Sprint 8 (AccountingModule). Logged.
 *   P-xx DocumentPackages → Module pending Sprint 9 (DocumentModule). Logged.
 *   P-xx CommConnection   → Requires admin configuration. Logged.
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    @InjectModel(Business.name)
    private readonly companyModel: Model<BusinessDocument>,
  ) {}

  /**
   * Runs all provisioning steps for a newly created Business.
   * Never throws — failures are logged and do not block the registration response.
   */
  async provisionBusiness(companyId: string): Promise<void> {
    this.logger.log(
      `[PROVISION] Starting provisioning for companyId=${companyId}`,
    );

    await this.p03FiscalProfileDefaults(companyId);
    this.p14ChartOfAccountsStub(companyId);
    this.pDocumentPackagesStub(companyId);
    this.pRelayConnectionStub(companyId);

    this.logger.log(`[PROVISION] Phase 2 complete for companyId=${companyId}`);
  }

  // ─── P-03 — Fiscal Profile ────────────────────────────────────────────────
  // The Company schema sets defaultCurrency='AUD', abn=null, depositAccount={...}
  // on creation. This step verifies those defaults are in place and patches if not.

  private async p03FiscalProfileDefaults(companyId: string): Promise<void> {
    try {
      const company = (await this.companyModel
        .findById(companyId)
        .lean()
        .exec()) as any;
      if (!company) {
        this.logger.warn(
          `[PROVISION:P-03] Company not found companyId=${companyId}`,
        );
        return;
      }

      const patch: Record<string, any> = {};
      if (!company.defaultCurrency) patch.defaultCurrency = 'AUD';
      if (!company.depositAccount)
        patch.depositAccount = { bsb: null, accountNumber: null };

      if (Object.keys(patch).length > 0) {
        await this.companyModel
          .findByIdAndUpdate(companyId, { $set: patch })
          .exec();
        this.logger.log(
          `[PROVISION:P-03] Applied fiscal defaults patch for companyId=${companyId}`,
        );
      } else {
        this.logger.log(
          `[PROVISION:P-03] Fiscal defaults already present companyId=${companyId}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `[PROVISION:P-03] Failed companyId=${companyId}: ${err?.message}`,
      );
    }
  }

  // ─── P-14 — Chart of Accounts (AU) ────────────────────────────────────────
  // AccountingModule does not exist yet (planned Sprint 8).
  // This stub is a placeholder so the provisioning flow is complete in structure.

  private p14ChartOfAccountsStub(companyId: string): void {
    this.logger.log(
      `[PROVISION:P-14] ChartOfAccounts AU — pending Sprint 8 (AccountingModule) companyId=${companyId}`,
    );
  }

  // ─── P-xx — Default Document Packages ────────────────────────────────────
  // DocumentModule does not exist yet (planned Sprint 9).

  private pDocumentPackagesStub(companyId: string): void {
    this.logger.log(
      `[PROVISION:P-xx] DocumentPackages — pending Sprint 9 (DocumentModule) companyId=${companyId}`,
    );
  }

  // ─── P-xx — Default Relay Connection ─────────────────────────────
  // Requires manual admin configuration (relay-app API key + companyId).
  // Cannot be auto-created without environment-level secrets.

  private pRelayConnectionStub(companyId: string): void {
    this.logger.log(
      `[PROVISION:P-xx] RelayConnection — requires admin configuration companyId=${companyId}`,
    );
  }
}
