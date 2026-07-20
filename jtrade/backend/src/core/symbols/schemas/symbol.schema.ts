import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { CompanyProvider } from '../../company-provider/schemas/company-provider.schema';

export type SymbolDocument = HydratedDocument<Symbol>;

@Schema({
  timestamps: true,
  collection: 'symbols',
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Symbol {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: CompanyProvider.name,
    required: true,
    index: true,
  })
  companyProviderId!: Types.ObjectId;

  @Prop({
    required: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  symbol!: string;

  @Prop({ type: [String], default: [] })
  aliases!: string[];

  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SymbolSchema = SchemaFactory.createForClass(Symbol);

SymbolSchema.index(
  {
    companyProviderId: 1,
    symbol: 1,
  },
  {
    unique: true,
    name: 'uniq_company_provider_symbol',
  },
);

SymbolSchema.virtual('companyProvider', {
  ref: CompanyProvider.name,
  localField: 'companyProviderId',
  foreignField: '_id',
  justOne: true,
});
