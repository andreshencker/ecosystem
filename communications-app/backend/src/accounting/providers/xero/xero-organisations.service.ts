// src/accounting/providers/xero/xero-organisations.service.ts
//
// Manages the safe metadata for Xero organisations authorised through a
// ProviderCredentials (OAuth connection).
//
// Responsibilities:
//   - Persist newly discovered organisations after OAuth.
//   - Reconcile the org list when the user triggers a refresh.
//   - Resolve a Communications organisation ID to the internal Xero tenant ID
//     for use by backend API calls (never exposed to external callers).
//   - List safe org metadata for the credentials page and org selector.
//
// This service never returns tenantId to callers.
// It never modifies the encrypted credential or its tokens.

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  XeroOrganisation,
  XeroOrganisationDocument,
} from './schemas/xero-organisation.schema';
import type { XeroConnectionItem } from './xero.oauth.types';
import type {
  XeroOrganisationResponse,
  XeroOrganisationsListResponse,
  XeroOrganisationsRefreshResponse,
} from './xero-organisations.types';

// ─── Internal input types ─────────────────────────────────────────────────────

type DiscoveredConnection = {
  connectionId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string | null;
};

@Injectable()
export class XeroOrganisationsService {
  private readonly logger = new Logger(XeroOrganisationsService.name);

  constructor(
    @InjectModel(XeroOrganisation.name)
    private readonly orgModel: Model<XeroOrganisationDocument>,
  ) {}

  // ─── Discovery and persistence ────────────────────────────────────────────────

  /**
   * Persists all organisations discovered after a successful OAuth exchange.
   *
   * Idempotent — uses updateOne with upsert so running this after a reconnect
   * updates existing records rather than creating duplicates.
   *
   * The `defaultTenantId` marks one org as the default (auto-selected when the
   * connection has exactly one available org or when the user chose one during
   * the multi-org selection dialog).
   */
  async saveDiscoveredOrganisations(params: {
    credentialId: string;
    companyId: string;
    connections: DiscoveredConnection[];
    defaultTenantId?: string;
  }): Promise<void> {
    const credentialId = new Types.ObjectId(params.credentialId);
    const companyId = new Types.ObjectId(params.companyId);
    const now = new Date();

    if (!params.connections.length) {
      this.logger.warn(
        `[xero-orgs] No connections to save for credentialId=${params.credentialId}`,
      );
      return;
    }

    for (const conn of params.connections) {
      const isDefault = params.defaultTenantId
        ? conn.tenantId === params.defaultTenantId
        : params.connections.length === 1; // auto-default when only one

      await this.orgModel.updateOne(
        { credentialId, tenantId: conn.tenantId },
        {
          $set: {
            companyId,
            tenantName: conn.tenantName,
            tenantType: conn.tenantType,
            xeroConnectionId: conn.connectionId,
            isAvailable: true,
            isDefault,
            lastVerifiedAt: now,
          },
          $setOnInsert: {
            credentialId,
            companyId,
            tenantId: conn.tenantId,
            discoveredAt: now,
          },
        },
        { upsert: true },
      );
    }

    this.logger.log(
      `[xero-orgs] Saved ${params.connections.length} org(s) for credentialId=${params.credentialId}`,
    );
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  /**
   * Reconciles the stored org list with the live Xero connections response.
   *
   * Orgs that are no longer in the Xero list are marked unavailable (not
   * deleted — preserves audit history and prevents dangling references).
   * Newly discovered orgs are added.
   */
  async reconcileOrganisations(params: {
    credentialId: string;
    companyId: string;
    freshConnections: XeroConnectionItem[];
  }): Promise<XeroOrganisationsRefreshResponse> {
    const credentialId = new Types.ObjectId(params.credentialId);
    const now = new Date();

    const freshTenantIds = new Set(
      params.freshConnections.map((c) => c.tenantId),
    );

    // Mark any previously-available org that is no longer in Xero as unavailable.
    const deactivated = await this.orgModel.updateMany(
      {
        credentialId,
        isAvailable: true,
        tenantId: { $nin: Array.from(freshTenantIds) },
      },
      { $set: { isAvailable: false } },
    );

    // Upsert all fresh connections.
    for (const conn of params.freshConnections) {
      await this.orgModel.updateOne(
        { credentialId, tenantId: conn.tenantId },
        {
          $set: {
            companyId: new Types.ObjectId(params.companyId),
            tenantName: conn.tenantName,
            tenantType: conn.tenantType,
            xeroConnectionId: conn.id,
            isAvailable: true,
            lastVerifiedAt: now,
          },
          $setOnInsert: {
            credentialId,
            companyId: new Types.ObjectId(params.companyId),
            tenantId: conn.tenantId,
            discoveredAt: now,
            isDefault: false,
          },
        },
        { upsert: true },
      );
    }

    const allOrgs = await this.orgModel.find({ credentialId }).lean();
    const nowAvailable = allOrgs.filter((o) => o.isAvailable).length;

    this.logger.log(
      `[xero-orgs] Reconciled orgs for credentialId=${params.credentialId}: ` +
        `fresh=${params.freshConnections.length} ` +
        `deactivated=${deactivated.modifiedCount} ` +
        `nowAvailable=${nowAvailable}`,
    );

    return {
      connectionId: params.credentialId,
      discovered: params.freshConnections.length,
      nowAvailable,
      nowUnavailable: allOrgs.length - nowAvailable,
      message: `${nowAvailable} organisation(s) now available.`,
    };
  }

  // ─── Listing ──────────────────────────────────────────────────────────────────

  /**
   * Lists all organisations for a credential with company isolation.
   * Never returns tenantId.
   */
  async listOrganisations(params: {
    credentialId: string;
    companyId: string;
  }): Promise<XeroOrganisationsListResponse> {
    const credentialId = new Types.ObjectId(params.credentialId);
    const companyId = new Types.ObjectId(params.companyId);

    const docs = await this.orgModel
      .find({ credentialId, companyId })
      .sort({ isDefault: -1, tenantName: 1 })
      .lean();

    const organisations = docs.map((d) => this.toResponse(d));
    const available = organisations.filter(
      (o) => o.status === 'available',
    ).length;

    return {
      connectionId: params.credentialId,
      providerKey: 'xero',
      total: organisations.length,
      available,
      organisations,
    };
  }

  // ─── Internal resolution (never exposed externally) ───────────────────────────

  /**
   * Resolves a Communications organisation ID to the internal Xero tenantId.
   *
   * Validates:
   *   - the org belongs to the given credential;
   *   - the org belongs to the given company;
   *   - the org is currently available.
   *
   * Returns null when the org is not found, wrong credential, wrong company,
   * or unavailable.  Callers should map null to a 422/503 as appropriate.
   *
   * NEVER returns the tenantId to external callers — only the backend uses
   * the resolved value to make Xero API calls.
   */
  /**
   * Resolves a Communications organisation ID to the internal Xero tenantId.
   *
   * Always validates that the org belongs to the given credential.
   * When companyId is provided it also validates company ownership — this is
   * required for external-facing calls (controller layer).
   * The provider layer may omit companyId because the credential already passed
   * company isolation in the runtime resolver.
   *
   * NEVER returns tenantId to external callers.
   */
  async resolveOrganisation(params: {
    organisationId: string;
    credentialId: string;
    companyId?: string;
  }): Promise<{ tenantId: string } | null> {
    if (!Types.ObjectId.isValid(params.organisationId)) return null;

    const filter: Record<string, unknown> = {
      _id: new Types.ObjectId(params.organisationId),
      credentialId: new Types.ObjectId(params.credentialId),
      isAvailable: true,
    };

    if (params.companyId) {
      filter['companyId'] = new Types.ObjectId(params.companyId);
    }

    const doc = await this.orgModel.findOne(filter).select('tenantId').lean();

    if (!doc) return null;
    return { tenantId: (doc as any).tenantId };
  }

  /**
   * Returns the count of available organisations for a credential.
   * Used for display-only purposes (org count in credential panel).
   */
  async countAvailable(credentialId: string): Promise<number> {
    return this.orgModel.countDocuments({
      credentialId: new Types.ObjectId(credentialId),
      isAvailable: true,
    });
  }

  /**
   * Returns the default (auto-selected) organisation for a credential, if one exists.
   * Used for single-org connections where auto-selection is deterministic.
   * Never returns tenantId.
   */
  async getDefaultOrganisation(
    credentialId: string,
    companyId: string,
  ): Promise<XeroOrganisationResponse | null> {
    const doc = await this.orgModel
      .findOne({
        credentialId: new Types.ObjectId(credentialId),
        companyId: new Types.ObjectId(companyId),
        isAvailable: true,
        isDefault: true,
      })
      .lean();

    return doc ? this.toResponse(doc as any) : null;
  }

  // ─── Mapper ───────────────────────────────────────────────────────────────────

  private toResponse(doc: any): XeroOrganisationResponse {
    return {
      id: String(doc._id),
      connectionId: String(doc.credentialId),
      providerKey: 'xero',
      name: doc.tenantName ?? null,
      type: doc.tenantType ?? 'ORGANISATION',
      status: doc.isAvailable ? 'available' : 'unavailable',
      isDefault: Boolean(doc.isDefault),
      discoveredAt:
        doc.discoveredAt instanceof Date
          ? doc.discoveredAt.toISOString()
          : String(doc.discoveredAt),
      lastVerifiedAt:
        doc.lastVerifiedAt instanceof Date
          ? doc.lastVerifiedAt.toISOString()
          : (doc.lastVerifiedAt ?? null),
    };
  }

  // ─── Cleanup on disconnect ────────────────────────────────────────────────────

  /**
   * Marks all organisations for a credential as unavailable when the OAuth
   * connection is disconnected.  Does not delete — preserves audit history.
   */
  async markAllUnavailable(credentialId: string): Promise<void> {
    await this.orgModel.updateMany(
      { credentialId: new Types.ObjectId(credentialId) },
      { $set: { isAvailable: false } },
    );
    this.logger.log(
      `[xero-orgs] All orgs marked unavailable for credentialId=${credentialId}`,
    );
  }
}
