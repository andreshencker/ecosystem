import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DomainCatalogue } from '../../domain-catalogue/schemas/domain-catalogue.schema';

export type EventType = 'notification' | 'alert' | 'request';

export type EventCatalogueDocument = HydratedDocument<EventCatalogue> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ _id: false })
export class EmailFilesConfig {
  @Prop({ type: [String], default: [] })
  required!: string[];

  @Prop({ type: [String], default: [] })
  optional!: string[];
}

export const EmailFilesConfigSchema =
  SchemaFactory.createForClass(EmailFilesConfig);

@Schema({ _id: false })
export class EmailChannelContent {
  @Prop({ type: Boolean, default: true })
  enabled!: boolean;

  @Prop({ type: String, default: '' })
  subject!: string;

  @Prop({ type: String, default: '' })
  content!: string;

  @Prop({ type: [String], default: [] })
  requiredVariables!: string[];

  @Prop({ type: [String], default: [] })
  optionalVariables!: string[];

  @Prop({ type: EmailFilesConfigSchema, default: () => ({}) })
  files!: EmailFilesConfig;
}

export const EmailChannelContentSchema =
  SchemaFactory.createForClass(EmailChannelContent);

@Schema({ _id: false })
export class SmsChannelContent {
  @Prop({ type: Boolean, default: true })
  enabled!: boolean;

  @Prop({ type: String, default: '' })
  content!: string;

  @Prop({ type: [String], default: [] })
  requiredVariables!: string[];

  @Prop({ type: [String], default: [] })
  optionalVariables!: string[];
}

export const SmsChannelContentSchema =
  SchemaFactory.createForClass(SmsChannelContent);

@Schema({ _id: false })
export class ChannelContent {
  @Prop({ type: EmailChannelContentSchema, required: false })
  email?: EmailChannelContent;

  @Prop({ type: SmsChannelContentSchema, required: false })
  sms?: SmsChannelContent;
}

export const ChannelContentSchema =
  SchemaFactory.createForClass(ChannelContent);

@Schema({
  collection: 'event_catalogue',
  versionKey: false,
  timestamps: true,
})
export class EventCatalogue {
  // importa DomainCatalogue (solo el name) si ya lo tienes accesible
  @Prop({
    type: Types.ObjectId,
    ref: DomainCatalogue.name,
    required: true,
    index: true,
  })
  domainCatalogueId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  eventKey!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({
    required: true,
    enum: ['notification', 'alert', 'request'],
    index: true,
  })
  eventType!: EventType;

  @Prop({ type: ChannelContentSchema, default: () => ({}) })
  channelContent!: ChannelContent;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const EventCatalogueSchema =
  SchemaFactory.createForClass(EventCatalogue);

EventCatalogueSchema.index(
  { domainCatalogueId: 1, eventKey: 1 },
  { unique: true, name: 'uniq_domainCatalogue_eventKey' },
);
