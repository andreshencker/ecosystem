// src/accounting/providers/xero/schemas/xero-organisation.schema.ts
//
// MongoDB document for a Xero organisation (tenant) authorised through one
// ProviderCredentials (OAuth connection).
//
// OWNERSHIP MODEL
// ───────────────
// One ProviderCredentials record (the "connection") may authorise access to
// multiple Xero organisations.  Each authorised org is stored as one document
// here.  This separates the OAuth token set (stored encrypted in the credential)
// from the organisation metadata (safe, unencrypted, queryable).
//
// SECURITY
// ────────
// The Xero tenantId is stored in plaintext because it is an identifier, not a
// secret.  Xero does not treat tenantIds as confidential.  What is confidential
// is the access token that authorises calls on behalf of that tenant — those
// are stored only in the encrypted credential.
//
// This collection NEVER stores: access tokens, refresh tokens, client secrets,
// or any encrypted payloads.  `tenantId` is kept internal and is never returned
// to external callers; the document _id is the public Communications org ID.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type XeroOrganisationDocument = HydratedDocument<XeroOrganisation> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({
  collection: 'xero_organisations',
  versionKey: false,
  timestamps: true,
})
export class XeroOrganisation {
  /** Reference to the ProviderCredentials that authorised access to this org. */
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
    ref: 'ProviderCredentials',
  })
  credentialId!: Types.ObjectId;

  /** The company that owns this credential (denormalised for fast isolation queries). */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  companyId!: Types.ObjectId;

  /**
   * Xero tenant UUID (internal — never returned in external API responses).
   * Used by backend to set the xero-tenant-id header for Xero API calls.
   */
  @Prop({ required: true })
  tenantId!: string;

  /** Human-readable organisation name returned by Xero. May be null. */
  @Prop({ type: String, default: null })
  tenantName!: string | null;

  /** Xero tenant type, e.g. 'ORGANISATION' or 'PRACTICEMANAGER'. */
  @Prop({ default: 'ORGANISATION' })
  tenantType!: string;

  /**
   * Xero connection UUID (the id from GET /connections).
   * Stored so the org can be individually revoked via DELETE /connections/{id}.
   */
  @Prop({ type: String, default: null })
  xeroConnectionId!: string | null;

  /**
   * Whether this organisation is available for use.
   * Set to false when the user revokes the organisation in Xero or when a
   * refresh discovers it is no longer in the authorised connections list.
   */
  @Prop({ default: true, index: true })
  isAvailable!: boolean;

  /**
   * Whether this is the default organisation for the connection.
   * Only one org per credential should be default at any time.
   * Used for auto-selection when the connection has exactly one available org.
   */
  @Prop({ default: false })
  isDefault!: boolean;

  /** When this org was first discovered (via OAuth callback or refresh). */
  @Prop({ required: true })
  discoveredAt!: Date;

  /** Last time the org was confirmed available by a Xero API call. */
  @Prop({ type: Date, default: null })
  lastVerifiedAt!: Date | null;
}

export const XeroOrganisationSchema =
  SchemaFactory.createForClass(XeroOrganisation);

// Composite unique index: one document per (credential × tenant).
XeroOrganisationSchema.index(
  { credentialId: 1, tenantId: 1 },
  { unique: true },
);

// Fast lookup by company when listing all orgs across connections.
XeroOrganisationSchema.index({ companyId: 1, credentialId: 1 });
