import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleCatalogEntryDocument = HydratedDocument<RoleCatalogEntry>;

/**
 * The single source of truth for role names — one collection, scoped by
 * flow (client/provider/internal), not by app. 'client' and 'provider' share
 * the same fixed role set across every app in the catalogue; 'internal' is
 * the global admin-level set. Nothing else in the codebase should hardcode
 * a role name — it should read from here.
 */
@Schema({ collection: 'role_catalog', timestamps: true, versionKey: false })
export class RoleCatalogEntry {
  @Prop({ required: true, enum: ['client', 'provider', 'internal'], index: true })
  flow!: 'client' | 'provider' | 'internal';

  @Prop({ required: true, trim: true })
  roleKey!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, min: 0, default: 0 })
  displayOrder!: number;
}

export const RoleCatalogEntrySchema = SchemaFactory.createForClass(RoleCatalogEntry);
RoleCatalogEntrySchema.index({ flow: 1, roleKey: 1 }, { unique: true });
