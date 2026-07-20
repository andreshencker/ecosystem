import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type SignalDocument = HydratedDocument<Signal>;

export enum SignalAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

@Schema({
  collection: 'signals',
  versionKey: false,
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Signal {
  /**
   * ID externo / de origen (si viene de un proveedor o motor)
   */
  @Prop({ type: String, required: true, trim: true, index: true })
  signalId!: string;

  /**
   * Relación con el indicador admin (mantengo tu diseño original)
   */
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'AdminIndicator',
    required: true,
    index: true,
  })
  adminIndicatorId!: Types.ObjectId;

  /**
   * Relación con la alerta del catálogo (de aquí se obtiene symbol/timeframe)
   */
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Alert',
    required: true,
    index: true,
  })
  alertId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'indicator',
    required: true,
    index: true,
  })
  indicatorId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(SignalAction),
    required: true,
    index: true,
  })
  action!: SignalAction;

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
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  })
  timeFrame!: string;

  /**
   * Activa/desactiva la señal (habilitada para operar)
   */
  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SignalSchema = SchemaFactory.createForClass(Signal);

/**
 * Índices recomendados con la nueva relación
 */
SignalSchema.index({ adminIndicatorId: 1, createdAt: -1 });
SignalSchema.index({ alertId: 1, createdAt: -1 });
SignalSchema.index({ isActive: 1, createdAt: -1 });

/**
 * Virtual para poblar la alerta (y desde ahí acceder a symbol/timeframe)
 */
SignalSchema.virtual('alert', {
  ref: 'Alert',
  localField: 'alertId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'indicatorId symbol timeframe isActive' },
});