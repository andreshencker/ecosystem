import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Channel, ChannelDocument } from './schemas/channel-catalog.schema';
import {
  Provider,
  ProviderDocument,
} from '../providers/schemas/provider.schema';

/**
 * Seeds the global channel and provider catalogue on application start.
 *
 * Fully idempotent — uses updateOne({ upsert: true }) so safe to run on
 * every restart and does nothing when records already exist.
 *
 * Seed data represents the canonical communication layer:
 *
 *   Channels: email · sms · storage
 *   Providers:
 *     email  → gmail (smtp)  · sendgrid (api_key) · mailgun (api_key)
 *     sms    → twilio (api_key)
 *     storage→ aws-s3 (access_keys)
 */
@Injectable()
export class CatalogBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogBootstrapService.name);

  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seedChannels();
      await this.seedProviders();
    } catch (err: any) {
      this.logger.error(
        `Catalog bootstrap failed: ${err?.message}`,
        err?.stack,
      );
    }
  }

  // ─── Channels ─────────────────────────────────────────────────────────────

  private async seedChannels(): Promise<void> {
    const channels = [
      {
        channelKey:        'email',
        displayName:       'Email',
        description:       'Transactional and marketing email delivery',
        contentFormat:     'html' as const,
        supportsTemplates: true,
        supportsFiles:     true,
        isActive:          true,
      },
      {
        channelKey:        'sms',
        displayName:       'SMS',
        description:       'Short message service for mobile notifications',
        contentFormat:     'text' as const,
        supportsTemplates: false,
        supportsFiles:     false,
        isActive:          true,
      },
      {
        channelKey:        'storage',
        displayName:       'Storage',
        description:       'File and object storage for reports and attachments',
        contentFormat:     'binary' as const,
        supportsTemplates: false,
        supportsFiles:     true,
        isActive:          true,
      },
      {
        channelKey:        'calendar',
        displayName:       'Calendar',
        description:       'Calendar event and scheduling integrations',
        contentFormat:     'text' as const,
        supportsTemplates: false,
        supportsFiles:     false,
        isActive:          true,
      },
    ];

    for (const ch of channels) {
      const { channelKey, displayName, description, ...structural } = ch;
      const result = await this.channelModel.updateOne(
        { channelKey },
        {
          // Always sync display metadata so name corrections propagate on restart.
          $set: { displayName, description },
          // Structural fields (format, flags, channelKey) only set on first insert.
          $setOnInsert: { channelKey, ...structural },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        this.logger.log(`Catalog: created channel "${channelKey}"`);
      } else {
        this.logger.debug(`Catalog: channel "${channelKey}" already exists`);
      }
    }
  }

  // ─── Providers ────────────────────────────────────────────────────────────

  private async seedProviders(): Promise<void> {
    const emailChannel = await this.channelModel
      .findOne({ channelKey: 'email' })
      .lean();
    const smsChannel = await this.channelModel
      .findOne({ channelKey: 'sms' })
      .lean();
    const storageChannel = await this.channelModel
      .findOne({ channelKey: 'storage' })
      .lean();
    const calendarChannel = await this.channelModel
      .findOne({ channelKey: 'calendar' })
      .lean();

    if (!emailChannel || !smsChannel || !storageChannel) {
      this.logger.warn(
        'Catalog: one or more channels missing — skipping provider seed.',
      );
      return;
    }

    const providers = [
      // ── Email providers ──────────────────────────────────────────────────
      {
        providerKey:    'gmail',
        displayName:    'Gmail',
        description:    'Google Gmail SMTP — for personal and small-team email',
        channelId:      emailChannel._id,
        connectionType: 'smtp' as const,
        isActive:       true,
      },
      {
        providerKey:    'sendgrid',
        displayName:    'SendGrid',
        description:    'Twilio SendGrid — high-volume transactional email API',
        channelId:      emailChannel._id,
        connectionType: 'api_key' as const,
        isActive:       true,
      },
      {
        providerKey:    'mailgun',
        displayName:    'Mailgun',
        description:    'Mailgun — developer-friendly email delivery API',
        channelId:      emailChannel._id,
        connectionType: 'api_key' as const,
        isActive:       true,
      },
      // ── SMS providers ────────────────────────────────────────────────────
      {
        providerKey:    'twilio',
        displayName:    'Twilio',
        description:    'Twilio Programmable Messaging — SMS and WhatsApp',
        channelId:      smsChannel._id,
        connectionType: 'api_key' as const,
        isActive:       true,
      },
      // ── Storage providers ────────────────────────────────────────────────
      {
        providerKey:    'aws-s3',
        displayName:    'Amazon S3',
        description:    'AWS S3 — object storage for files and reports',
        channelId:      storageChannel._id,
        connectionType: 'access_keys' as const,
        isActive:       true,
      },

      // ── Calendar providers ───────────────────────────────────────────────
      ...(calendarChannel
        ? [
            {
              providerKey:    'icloud',
              displayName:    'iCloud Calendar',
              description:    'Apple iCloud Calendar via CalDAV (app-specific password)',
              channelId:      calendarChannel._id,
              connectionType: 'app_password' as const,
              isActive:       true,
            },
            {
              providerKey:    'google_calendar',
              displayName:    'Google Calendar',
              description:    'Google Calendar API v3 via OAuth 2.0',
              channelId:      calendarChannel._id,
              connectionType: 'oauth' as const,
              isActive:       true,
            },
            {
              providerKey:    'outlook_calendar',
              displayName:    'Outlook Calendar',
              description:    'Microsoft Outlook Calendar via Microsoft Graph API (OAuth 2.0)',
              channelId:      calendarChannel._id,
              connectionType: 'oauth' as const,
              isActive:       true,
            },
          ]
        : []),
    ];

    for (const p of providers) {
      const result = await this.providerModel.updateOne(
        { providerKey: p.providerKey },
        { $setOnInsert: p },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        this.logger.log(`Catalog: created provider "${p.providerKey}"`);
      } else {
        this.logger.debug(
          `Catalog: provider "${p.providerKey}" already exists`,
        );
      }
    }
  }
}
