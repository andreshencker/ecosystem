import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InvoiceReviewItemDocument = HydratedDocument<InvoiceReviewItem>;

@Schema({ collection: 'invoice_review_items', timestamps: true, versionKey: false })
export class InvoiceReviewItem {
  @Prop({ required: true, index: true }) businessId!: string;
  @Prop({ required: true, index: true }) groupId!: string;
  @Prop({ required: true }) date!: string;
  @Prop({ required: true, trim: true }) concept!: string;
  @Prop({ required: true }) amount!: string;
}

export const InvoiceReviewItemSchema = SchemaFactory.createForClass(InvoiceReviewItem);
InvoiceReviewItemSchema.index({ businessId: 1, groupId: 1 });
