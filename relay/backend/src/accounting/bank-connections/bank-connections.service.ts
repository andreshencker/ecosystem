// src/accounting/bank-connections/bank-connections.service.ts
//
// CRUD layer for persisted BankConnection documents.
//
// Provider-side operations (creating consent flows, syncing accounts, revoking
// tokens) are NOT implemented here yet — they will be added when a real Open
// Banking provider adapter is registered. This service manages only the platform-
// side lifecycle of stored connections.

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import {
  BankConnection,
  BankConnectionDocument,
} from './schemas/bank-connection.schema';
import type { ListBankConnectionsQueryDto } from './dto/list-bank-connections.dto';
import { AccountingResourceNotFoundError } from '../errors/accounting.errors';
import type { AccountingListResult } from '../types/accounting.types';

// ─── Response shape ───────────────────────────────────────────────────────────

export interface BankConnectionResponse {
  id: string;
  companyId: string;
  providerKey: string;
  providerConnectionId: string | null;
  institutionId: string | null;
  institutionName: string | null;
  status: string;
  consentStatus: string | null;
  consentExpiresAt: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  accountsCount: number;
  createdAt: string;
  updatedAt: string;
}

function toResponse(
  doc: BankConnection & { _id: unknown; createdAt: Date; updatedAt: Date },
): BankConnectionResponse {
  return {
    id: String(doc._id),
    companyId: doc.companyId,
    providerKey: doc.providerKey,
    providerConnectionId: doc.providerConnectionId ?? null,
    institutionId: doc.institutionId ?? null,
    institutionName: doc.institutionName ?? null,
    status: doc.status,
    consentStatus: doc.consentStatus ?? null,
    consentExpiresAt: doc.consentExpiresAt?.toISOString() ?? null,
    connectedAt: doc.connectedAt?.toISOString() ?? null,
    lastSyncedAt: doc.lastSyncedAt?.toISOString() ?? null,
    accountsCount: doc.accountsCount ?? 0,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BankConnectionsService {
  private readonly logger = new Logger(BankConnectionsService.name);

  constructor(
    @InjectModel(BankConnection.name)
    private readonly model: Model<BankConnectionDocument>,
  ) {}

  /**
   * Lists bank connections for a company.
   *
   * Filters: provider (providerKey), institution (name substring), status,
   * and a general search term (matched against institutionName).
   *
   * @param companyId  From the authenticated JWT — enforces company isolation.
   */
  async list(
    companyId: string,
    query: ListBankConnectionsQueryDto,
  ): Promise<AccountingListResult<BankConnectionResponse>> {
    const filter: Record<string, unknown> = { companyId };

    if (query.provider) {
      filter.providerKey = query.provider;
    }
    if (query.status) {
      filter.status = query.status;
    }

    const searchTerm = query.institution ?? query.search;
    if (searchTerm) {
      filter.institutionName = { $regex: searchTerm, $options: 'i' };
    }

    const docs = await this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return {
      data: docs.map((d) => toResponse(d as Parameters<typeof toResponse>[0])),
      hasMore: false,
      total: docs.length,
    };
  }

  /**
   * Retrieves a single bank connection by ID.
   * Returns null when the connection is not found or belongs to another company.
   */
  async findOne(
    companyId: string,
    id: string,
  ): Promise<BankConnectionResponse | null> {
    const doc = await this.model.findOne({ _id: id, companyId }).lean().exec();
    if (!doc) return null;
    return toResponse(doc as Parameters<typeof toResponse>[0]);
  }

  /**
   * Marks a connection as disconnected.
   * Provider-side token revocation is a future responsibility of the provider adapter.
   */
  async disconnect(companyId: string, id: string): Promise<void> {
    const doc = await this.model.findOne({ _id: id, companyId });
    if (!doc) {
      throw new AccountingResourceNotFoundError('bank connection', id);
    }
    doc.status = 'disconnected';
    await doc.save();
    this.logger.log(
      `[disconnect] bank connection disconnected companyId=${companyId} id=${id}`,
    );
  }
}
