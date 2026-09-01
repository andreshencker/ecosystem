import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SymbolDocument = HydratedDocument<Symbol>;

/**
 * A tradable symbol in a provider organization's catalogue (e.g. EURUSD, BTCUSD).
 * Ownership is the Grapifly organization id, taken from the caller's JWT
 * (`AuthContext.organizationId`) — never from the request body.
 */
@Schema({ collection: 'symbols', timestamps: true, versionKey: false })
export class Symbol {
  @Prop({ required: true, trim: true, index: true })
  providerOrganizationId!: string;

  @Prop({ required: true, trim: true })
  createdByGrapiflyUserId!: string;

  @Prop({ required: true, uppercase: true, trim: true })
  symbol!: string;

  @Prop({ type: [String], default: [] })
  aliases!: string[];

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SymbolSchema = SchemaFactory.createForClass(Symbol);

SymbolSchema.index({ providerOrganizationId: 1, symbol: 1 }, { unique: true });
SymbolSchema.index({ providerOrganizationId: 1, isActive: 1, symbol: 1 });
