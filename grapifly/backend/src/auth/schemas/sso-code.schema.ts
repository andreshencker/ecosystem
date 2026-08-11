import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SsoCodeDocument = HydratedDocument<SsoCode>;

@Schema({ collection: 'sso_codes', timestamps: true, versionKey: false })
export class SsoCode {
  @Prop({ required: true, unique: true, index: true })
  codeHash!: string;

  @Prop({ required: true, index: true })
  grapiflyUserId!: string;

  @Prop({ required: true, enum: ['relay'], index: true })
  appKey!: 'relay';

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  consumedAt!: Date | null;
}

export const SsoCodeSchema = SchemaFactory.createForClass(SsoCode);
SsoCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
