// src/accounting/bank-connections/schemas/bank-connection.schema.ts
//
// Canonical persistence model for an Open Banking connection.
//
// A BankConnection represents a link between a company and an external
// financial institution established through an Open Banking provider
// (e.g. Basiq, TrueLayer, Plaid).
//
// NOT to be confused with:
//   - Xero bank accounts (fetched live from Xero's Chart of Accounts)
//   - ProviderCredentials (OAuth tokens for accounting providers)
//
// This document is created when a user completes an Open Banking consent flow
// and updated as the connection status, consent, and sync state change.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BankConnectionDocument = HydratedDocument<BankConnection> & {
  createdAt: Date;
  updatedAt: Date;
};

export type BankConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'expired'
  | 'error'
  | 'pending';

export type BankConsentStatus = 'active' | 'expired' | 'pending';

@Schema({
  collection: 'accounting_bank_connections',
  timestamps: true,
  versionKey: false,
})
export class BankConnection {
  /** Company that owns this connection. Denormalised for fast isolation queries. */
  @Prop({ required: true, index: true })
  companyId!: string;

  /** Stable key of the Open Banking provider (e.g. 'basiq', 'truelayer'). */
  @Prop({ required: true })
  providerKey!: string;

  /**
   * The connection identifier assigned by the provider after consent.
   * Null until the consent flow completes.
   */
  @Prop({ type: String, default: null })
  providerConnectionId!: string | null;

  /** Provider-specific institution identifier. */
  @Prop({ type: String, default: null })
  institutionId!: string | null;

  /** Human-readable institution name (e.g. 'Commonwealth Bank'). */
  @Prop({ type: String, default: null })
  institutionName!: string | null;

  /** Current lifecycle status of the connection. */
  @Prop({
    required: true,
    enum: ['connected', 'disconnected', 'expired', 'error', 'pending'],
    default: 'pending',
  })
  status!: BankConnectionStatus;

  /**
   * Status of the user's consent grant.
   * Null when the provider does not surface consent information.
   */
  @Prop({
    type: String,
    enum: ['active', 'expired', 'pending', null],
    default: null,
  })
  consentStatus!: BankConsentStatus | null;

  /** When the user's consent expires. Null when unknown or not applicable. */
  @Prop({ type: Date, default: null })
  consentExpiresAt!: Date | null;

  /** When the connection was first successfully established. */
  @Prop({ type: Date, default: null })
  connectedAt!: Date | null;

  /** When the provider last successfully synchronised data for this connection. */
  @Prop({ type: Date, default: null })
  lastSyncedAt!: Date | null;

  /**
   * Number of bank accounts associated with this connection.
   * Populated after the first account sync. Zero until then.
   */
  @Prop({ type: Number, default: 0 })
  accountsCount!: number;
}

export const BankConnectionSchema =
  SchemaFactory.createForClass(BankConnection);

// Fast lookup of all connections for a company.
BankConnectionSchema.index({ companyId: 1, providerKey: 1 });

// Prevent duplicate provider-side connections per company.
BankConnectionSchema.index(
  { companyId: 1, providerConnectionId: 1 },
  { unique: true, sparse: true },
);
