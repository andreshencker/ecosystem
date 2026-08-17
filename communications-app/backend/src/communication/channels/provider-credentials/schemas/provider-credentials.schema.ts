import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ProviderCredentialsDocument =
  HydratedDocument<ProviderCredentials> & {
    createdAt: Date;
    updatedAt: Date;
  };

export type EncryptedPayload = {
  alg: string;
  ivBase64: string;
  tagBase64: string;
  dataBase64: string;
};

@Schema({
  collection: 'provider_credentials',
  versionKey: false,
  timestamps: true,
})
export class ProviderCredentials {
  /** Canonical tenant copied from the owning provider configuration. */
  @Prop({ type: String, default: null, index: true })
  grapiflyOrganizationId!: string | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'CompanyChannelProvider',
    required: true,
    index: true, // ✅ útil
  })
  companyChannelProviderId!: Types.ObjectId;

  // ✅ obligatorio: "marketing", "support", etc.
  @Prop({ required: true, trim: true, lowercase: true })
  tag!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  encrypted!: EncryptedPayload;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  /**
   * Non-secret display value derived from the credential payload before
   * encryption. Safe to return in list responses without decryption.
   *
   * Examples:
   *   SMTP/Gmail  → user email or fromEmail
   *   SendGrid    → fromEmail or "API Key configured"
   *   Mailgun     → domain or fromEmail
   *   Twilio      → fromNumber (E.164 phone)
   *   AWS S3      → bucket name or masked accessKeyId (AKIA***XXXX)
   *
   * Never contains passwords, API keys, secrets, or auth tokens.
   * Undefined for records created before this field was added.
   */
  @Prop({ type: String, default: undefined })
  displayIdentifier?: string;

  /**
   * The execution environment reported by the credential contract at
   * save / update time.
   *
   * This is the canonical source of truth for test vs live.
   * Set directly from the normalized credential's `mode` field — never
   * inferred from key prefixes or other presentation fields.
   *
   * Null for records created before this field was added (re-save the
   * credential to populate it).
   */
  @Prop({ type: String, default: null })
  mode?: 'test' | 'live' | null;

  /**
   * For OAuth credentials only: which app registration backs this
   * connection — 'ecosystem' when it references a platform-owned
   * OAuthApplication (oauthApplicationId), 'own' when the tenant entered
   * their own clientId/clientSecret directly. Null for non-OAuth
   * connection types or records predating this field.
   *
   * Non-secret — safe to return in list/detail responses without
   * decryption. Lets the UI show an accurate "Connected" state per tab
   * (Ecosystem vs Developer) instead of inferring it from form state.
   */
  @Prop({ type: String, default: null })
  oauthAppSource?: 'ecosystem' | 'own' | null;
}

export const ProviderCredentialsSchema =
  SchemaFactory.createForClass(ProviderCredentials);

// ✅ único por (companyChannelProviderId + tag)
ProviderCredentialsSchema.index(
  { companyChannelProviderId: 1, tag: 1 },
  { unique: true, name: 'uniq_ccp_tag' },
);
ProviderCredentialsSchema.index({ grapiflyOrganizationId: 1, isActive: 1 });
