import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InvoiceStatus = 'approved';
export type InvoiceDocument = HydratedDocument<Invoice>;

/**
 * Immutable snapshot created when a user approves a pending-invoice group.
 *
 * All monetary values are stored as strings (decimal) to match BI precision.
 * The shiftIds array records which Shift documents are covered — those shifts
 * are marked invoiceStatus='invoiced' atomically during approval.
 */
@Schema({
  collection: 'invoices',
  timestamps: true,
  versionKey: false,
})
export class Invoice {
  @Prop({ required: true, index: true })
  businessId!: string;

  @Prop({ required: true, index: true })
  customerId!: string;

  @Prop({ required: true, index: true })
  contractId!: string;

  /** Human-readable invoice number, e.g. "INV-001" or "PREFIX-042". */
  @Prop({ required: true })
  invoiceNumber!: string;

  /** YYYY-MM-DD inclusive start of the billed period. */
  @Prop({ required: true })
  periodStart!: string;

  /** YYYY-MM-DD inclusive end of the billed period. */
  @Prop({ required: true })
  periodEnd!: string;

  @Prop({ required: true, default: 'AUD' })
  currency!: string;

  /** IDs of Shift documents included in this invoice. */
  @Prop({ type: [String], required: true })
  shiftIds!: string[];

  /** Decimal string — sum of line amounts before tax. */
  @Prop({ required: true })
  subtotal!: string;

  /** Decimal string — tax component. */
  @Prop({ required: true })
  taxAmount!: string;

  /** Decimal string — subtotal + taxAmount. */
  @Prop({ required: true })
  total!: string;

  /** Deterministic groupId from BI calculation. */
  @Prop({ required: true, index: true })
  groupId!: string;

  @Prop({
    required: true,
    enum: ['approved'],
    default: 'approved',
  })
  status!: InvoiceStatus;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ businessId: 1, contractId: 1 });
InvoiceSchema.index({ businessId: 1, customerId: 1 });
InvoiceSchema.index({ businessId: 1, groupId: 1 }, { unique: true });
