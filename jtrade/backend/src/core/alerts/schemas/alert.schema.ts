import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import { IndicatorProject } from '../../indicator-projects/schemas/indicator-project.schema';
import { Symbol } from '../../symbols/schemas/symbol.schema';

export type AlertDocument = HydratedDocument<Alert>;

export enum AlertAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

@Schema({
  timestamps: true,
  collection: 'alerts',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Alert {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: IndicatorProject.name,
    required: true,
    index: true,
  })
  indicatorProjectId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Symbol.name,
    required: true,
    index: true,
  })
  symbolId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  groupId!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  })
  symbol!: string;

  @Prop({
    type: String,
    enum: Object.values(AlertAction),
    required: true,
    uppercase: true,
    index: true,
  })
  action!: AlertAction;

  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  })
  timeFrame!: string;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index(
  {
    indicatorProjectId: 1,
    symbolId: 1,
    timeFrame: 1,
    action: 1,
  },
  {
    unique: true,
    name: 'uniq_alert_indicator_project_symbol_timeframe_action',
  },
);

AlertSchema.index({
  groupId: 1,
  createdAt: -1,
});

AlertSchema.virtual('indicatorProject', {
  ref: IndicatorProject.name,
  localField: 'indicatorProjectId',
  foreignField: '_id',
  justOne: true,
});

AlertSchema.virtual('symbolData', {
  ref: Symbol.name,
  localField: 'symbolId',
  foreignField: '_id',
  justOne: true,
});
