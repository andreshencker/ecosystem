import { Prop } from '@nestjs/mongoose';

/**
 * Extend this class in every new Mongoose schema to get auditing, soft-delete,
 * and optimistic locking fields out of the box.
 *
 * Usage:
 *   @Schema({ collection: 'my_entities', timestamps: true, versionKey: false })
 *   export class MyEntity extends BaseDocument { ... }
 *   export const MyEntitySchema = SchemaFactory.createForClass(MyEntity);
 *
 * SchemaFactory walks the prototype chain, so all @Prop() decorators
 * defined here are included in the child schema automatically.
 *
 * createdAt / updatedAt are provided by { timestamps: true } — do not declare them here.
 */
export class BaseDocument {
  @Prop({ type: String, required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, default: null })
  createdBy!: string | null;

  @Prop({ type: String, default: null })
  updatedBy!: string | null;

  @Prop({ type: Date, default: null, index: true })
  deletedAt!: Date | null;

  @Prop({ type: String, default: null })
  deletedBy!: string | null;

  /** Monotonically increasing counter for optimistic locking. Starts at 1. */
  @Prop({ type: Number, default: 1 })
  version!: number;

  createdAt!: Date;
  updatedAt!: Date;
}
