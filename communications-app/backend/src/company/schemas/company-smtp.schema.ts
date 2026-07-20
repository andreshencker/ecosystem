import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CompanySmtpDocument = HydratedDocument<CompanySmtp> & {
  createdAt: Date;
  updatedAt: Date;
};

export type EncryptedPayload = {
  alg: string;
  ivBase64: string;
  tagBase64: string;
  dataBase64: string;
};

/**
 * Stores SMTP credentials for a company's outbound email (invitation sender).
 * Sensitive fields (host, port, secure, user, pass) are stored as an AES-256-GCM
 * encrypted blob. Display-safe fields (fromEmail, fromName) are stored plaintext
 * so they can be shown in the UI without decryption.
 */
@Schema({ collection: 'company_smtp', timestamps: true, versionKey: false })
export class CompanySmtp {
  @Prop({ required: true, index: true, unique: true })
  companyId!: string;

  /** Displayed in UI — not sensitive. */
  @Prop({ type: String, default: '' })
  fromEmail!: string;

  /** Displayed in UI — not sensitive. */
  @Prop({ type: String, default: '' })
  fromName!: string;

  /** Encrypted blob: { host, port, secure, user, pass } */
  @Prop({ type: Object, default: null })
  credentials!: EncryptedPayload | null;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  /** Set after a successful connection test. */
  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;
}

export const CompanySmtpSchema = SchemaFactory.createForClass(CompanySmtp);
