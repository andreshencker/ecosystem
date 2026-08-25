// src/communication/channels/oauth-applications/schemas/oauth-application.schema.ts
//
// Represents one real-world OAuth 2.0 app registration (e.g. one Google Cloud
// OAuth client) owned by a company. Deliberately channel-agnostic: the same
// registration can back multiple ProviderCredentials records across
// different channels (e.g. Email's Gmail-read and Identity's Google-login),
// because the clientId/clientSecret identify the app itself, not any
// particular authorization/token — those stay on ProviderCredentials since
// scopes (and therefore tokens) differ per use.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { EncryptedPayload } from '../../../common/security/crypto.service';

export type OAuthApplicationDocument = HydratedDocument<OAuthApplication> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({
  collection: 'oauth_applications',
  versionKey: false,
  timestamps: true,
})
export class OAuthApplication {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  /**
   * Which OAuth provider family this app was registered with — 'google',
   * 'microsoft', 'apple', etc. Used to filter the reuse picker so a company
   * never sees a Microsoft app while configuring a Google-based provider.
   */
  @Prop({ required: true, trim: true, lowercase: true, index: true })
  providerFamily!: string;

  /** User-chosen label, e.g. "Google — main account". Shown in the reuse picker. */
  @Prop({ required: true, trim: true })
  displayName!: string;

  /** Not a secret — safe to display (truncated) in the reuse picker. */
  @Prop({ required: true, trim: true })
  clientId!: string;

  /** SHA-256... no — AES-256-GCM encrypted clientSecret. Never returned to clients. */
  @Prop({
    type: {
      alg: { type: String, required: true },
      ivBase64: { type: String, required: true },
      tagBase64: { type: String, required: true },
      dataBase64: { type: String, required: true },
    },
    required: true,
    _id: false,
  })
  encryptedSecret!: EncryptedPayload;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const OAuthApplicationSchema =
  SchemaFactory.createForClass(OAuthApplication);

OAuthApplicationSchema.index({ companyId: 1, providerFamily: 1, isActive: 1 });
