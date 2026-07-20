import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type SymbolExecutionDocument = HydratedDocument<SymbolExecution>;

@Schema({
  timestamps: true,
  collection: 'symbol_executions',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SymbolExecution {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'UserAccountInfo',
    required: true,
    index: true,
  })
  userAccountInfoId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  alertGroupId!: string;

  @Prop({ type: Number, required: true })
  contractSize!: number;

  @Prop({ type: Number, required: true })
  riskPercent!: number;

  @Prop({ type: Number, required: true, default: 0 })
  stopDistancePips!: number;

  @Prop({ type: Number, required: true, default: 0 })
  returnRatio!: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: true })
  useStopLoss!: boolean;

  @Prop({ type: Boolean, default: true })
  useTakeProfit!: boolean;

  @Prop({ type: Boolean, default: false })
  useTrailingStop!: boolean;

  @Prop({ type: Boolean, default: true })
  useBreakEven!: boolean;

  @Prop({ type: Number, required: true, default: 0 })
  atrPeriod!: number;

  @Prop({ type: Number, required: true, default: 0 })
  atrMultiplier!: number;

  @Prop({ type: Boolean, default: false })
  closeTradesOnWeekend!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SymbolExecutionSchema =
    SchemaFactory.createForClass(SymbolExecution);

SymbolExecutionSchema.index(
    { userAccountInfoId: 1, alertGroupId: 1 },
    { unique: true },
);

SymbolExecutionSchema.virtual('userAccountInfo', {
  ref: 'UserAccountInfo',
  localField: 'userAccountInfoId',
  foreignField: '_id',
  justOne: true,
});