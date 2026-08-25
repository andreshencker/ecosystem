import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommunicationTokenDocument = HydratedDocument<CommunicationToken>;

/**
 * The ecosystem's single external-communication credential — issued per
 * organization, used by outside systems (e.g. business-app) to call into
 * apps like Relay. Apps never mint or store this themselves; they call
 * Grapifly's validate endpoint on every request. See CommunicationTokensService.
 */
@Schema({ collection: 'communication_tokens', timestamps: true, versionKey: false })
export class CommunicationToken {
  @Prop({ required: true, unique: true, index: true })
  tokenId!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: '' })
  description!: string;

  /** SHA-256 hash of the raw token. Never returned to clients. */
  @Prop({ required: true, select: false })
  tokenHash!: string;

  /** Safe display prefix, e.g. "gpf_comm_a1b2c3d4…". */
  @Prop({ required: true })
  tokenPrefix!: string;

  @Prop({ required: true, enum: ['active', 'revoked'], default: 'active', index: true })
  status!: 'active' | 'revoked';

  @Prop({ type: Date, default: null })
  lastUsedAt!: Date | null;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ required: true })
  createdBy!: string;
}

export const CommunicationTokenSchema = SchemaFactory.createForClass(CommunicationToken);
