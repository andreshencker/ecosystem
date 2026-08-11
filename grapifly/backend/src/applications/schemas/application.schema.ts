import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ApplicationDocument = HydratedDocument<Application>;

@Schema({ collection: 'applications', timestamps: true, versionKey: false })
export class Application {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  key!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, trim: true })
  launchUrl!: string;

  @Prop({ required: true, enum: ['first_party', 'third_party'], default: 'first_party' })
  ownership!: 'first_party' | 'third_party';

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active', index: true })
  status!: 'active' | 'inactive';

  @Prop({ required: true, min: 0, default: 0 })
  displayOrder!: number;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
