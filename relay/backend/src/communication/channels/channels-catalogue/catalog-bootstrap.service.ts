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
 *   Channels: email · sms · storage · calendar · payment · accounting · billing · identity
 *   Providers:
 *     email      → gmail (smtp) · gmail_oauth (oauth) · sendgrid (api_key) · mailgun (api_key)
 *     sms        → twilio (api_key)
 *     storage    → aws-s3 (access_keys) · cloudflare-r2 (access_keys)
 *     calendar   → icloud (app_password) · google_calendar (oauth) · outlook_calendar (oauth)
 *     payment    → stripe (api_key) · coingate (token)
 *     accounting → xero (oauth)   ← also assigned to billing
 *     billing    → xero (oauth)   ← same provider record as above
 *     identity   → google_identity (oauth) — "Sign in with Google"; can reuse
 *                  the same OAuth application as email's gmail_oauth provider
 *                  via oauth-applications
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
        channelKey: 'email',
        displayName: 'Email',
        description: 'Transactional and marketing email delivery',
        contentFormat: 'html' as const,
        supportsTemplates: true,
        supportsFiles: true,
        isActive: true,
      },
      {
        channelKey: 'sms',
        displayName: 'SMS',
        description: 'Short message service for mobile notifications',
        contentFormat: 'text' as const,
        supportsTemplates: false,
        supportsFiles: false,
        isActive: true,
      },
      {
        channelKey: 'storage',
        displayName: 'Storage',
        description: 'File and object storage for reports and attachments',
        contentFormat: 'binary' as const,
        supportsTemplates: false,
        supportsFiles: true,
        isActive: true,
      },
      {
        channelKey: 'calendar',
        displayName: 'Calendar',
        description: 'Calendar event and scheduling integrations',
        contentFormat: 'text' as const,
        supportsTemplates: false,
        supportsFiles: false,
        isActive: true,
      },
      {
        channelKey: 'payment',
        displayName: 'Payments',
        description:
          'Payment provider integrations for processing transactions',
        contentFormat: 'text' as const,
        supportsTemplates: false,
        supportsFiles: false,
        isActive: true,
      },
      {
        channelKey: 'accounting',
        displayName: 'Accounting',
        description:
          'Accounting provider integrations and accounting-related capabilities',
        contentFormat: 'text' as const,
        supportsTemplates: false,
        supportsFiles: false,
        isActive: true,
      },
      {
        channelKey: 'billing',
        displayName: 'Billing',
        description: 'Billing and invoicing provider integrations',
        contentFormat: 'text' as const,
        supportsTemplates: false,
        supportsFiles: false,
        isActive: true,
      },
      {
        channelKey: 'identity',
        displayName: 'Identity',
        description:
          'OAuth-based "sign in with a provider" flows for external applications — Relay performs the provider handshake and hands back the verified profile',
        contentFormat: 'text' as const,
        supportsTemplates: false,
        supportsFiles: false,
        isActive: true,
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
    const [
      emailChannel,
      smsChannel,
      storageChannel,
      calendarChannel,
      paymentChannel,
      accountingChannel,
      billingChannel,
      identityChannel,
    ] = await Promise.all([
      this.channelModel.findOne({ channelKey: 'email' }).lean(),
      this.channelModel.findOne({ channelKey: 'sms' }).lean(),
      this.channelModel.findOne({ channelKey: 'storage' }).lean(),
      this.channelModel.findOne({ channelKey: 'calendar' }).lean(),
      this.channelModel.findOne({ channelKey: 'payment' }).lean(),
      this.channelModel.findOne({ channelKey: 'accounting' }).lean(),
      this.channelModel.findOne({ channelKey: 'billing' }).lean(),
      this.channelModel.findOne({ channelKey: 'identity' }).lean(),
    ]);

    if (!emailChannel || !smsChannel || !storageChannel) {
      this.logger.warn(
        'Catalog: one or more core channels missing — skipping provider seed.',
      );
      return;
    }

    const providers = [
      // ── Email providers ──────────────────────────────────────────────────
      {
        providerKey: 'gmail',
        displayName: 'Gmail',
        description: 'Google Gmail SMTP — for personal and small-team email',
        channelIds: [emailChannel._id],
        connectionType: 'smtp' as const,
        isActive: true,
      },
      {
        providerKey: 'gmail_oauth',
        displayName: 'Gmail (OAuth)',
        description:
          'Google Gmail via OAuth 2.0 — connect a real mailbox to send and read email (Gmail API)',
        channelIds: [emailChannel._id],
        connectionType: 'oauth' as const,
        isActive: true,
      },
      {
        providerKey: 'sendgrid',
        displayName: 'SendGrid',
        description: 'Twilio SendGrid — high-volume transactional email API',
        channelIds: [emailChannel._id],
        connectionType: 'api_key' as const,
        isActive: true,
      },
      {
        providerKey: 'mailgun',
        displayName: 'Mailgun',
        description: 'Mailgun — developer-friendly email delivery API',
        channelIds: [emailChannel._id],
        connectionType: 'api_key' as const,
        isActive: true,
      },
      // ── SMS providers ────────────────────────────────────────────────────
      {
        providerKey: 'twilio',
        displayName: 'Twilio',
        description: 'Twilio Programmable Messaging — SMS and WhatsApp',
        channelIds: [smsChannel._id],
        connectionType: 'api_key' as const,
        isActive: true,
      },
      // ── Storage providers ────────────────────────────────────────────────
      {
        providerKey: 'aws-s3',
        displayName: 'Amazon S3',
        description: 'AWS S3 — object storage for files and reports',
        channelIds: [storageChannel._id],
        connectionType: 'access_keys' as const,
        isActive: true,
      },
      {
        providerKey: 'cloudflare-r2',
        displayName: 'Cloudflare R2',
        description:
          'Cloudflare R2 — S3-compatible object storage, no egress fees',
        channelIds: [storageChannel._id],
        connectionType: 'access_keys' as const,
        isActive: true,
      },

      // ── Calendar providers ───────────────────────────────────────────────
      ...(calendarChannel
        ? [
            {
              providerKey: 'icloud',
              displayName: 'iCloud Calendar',
              description:
                'Apple iCloud Calendar via CalDAV (app-specific password)',
              channelIds: [calendarChannel._id],
              connectionType: 'app_password' as const,
              isActive: true,
            },
            {
              providerKey: 'google_calendar',
              displayName: 'Google Calendar',
              description: 'Google Calendar API v3 via OAuth 2.0',
              channelIds: [calendarChannel._id],
              connectionType: 'oauth' as const,
              isActive: true,
            },
            {
              providerKey: 'outlook_calendar',
              displayName: 'Outlook Calendar',
              description:
                'Microsoft Outlook Calendar via Microsoft Graph API (OAuth 2.0)',
              channelIds: [calendarChannel._id],
              connectionType: 'oauth' as const,
              isActive: true,
            },
          ]
        : []),

      // ── Payment providers ────────────────────────────────────────────────
      ...(paymentChannel
        ? [
            {
              providerKey: 'stripe',
              displayName: 'Stripe',
              description: 'Stripe — online payment processing via API keys',
              channelIds: [paymentChannel._id],
              connectionType: 'api_key' as const,
              isActive: true,
            },
            {
              providerKey: 'stripe-connect',
              displayName: 'Stripe Connect',
              description:
                'Stripe Connect — marketplace onboarding: connected accounts, hosted KYC, and destination charges with an application fee',
              channelIds: [paymentChannel._id],
              connectionType: 'api_key' as const,
              isActive: true,
            },
            {
              providerKey: 'coingate',
              displayName: 'CoinGate',
              description:
                'CoinGate cryptocurrency payment gateway. Accept Bitcoin, Ethereum, and 70+ other cryptocurrencies.',
              channelIds: [paymentChannel._id],
              connectionType: 'token' as const,
              isActive: true,
            },
          ]
        : []),

      // ── Accounting + Billing providers ───────────────────────────────────
      // Xero is a single provider assigned to both Accounting and Billing channels.
      // OAuth implementation is deferred; the provider is registered now.
      ...(accountingChannel && billingChannel
        ? [
            {
              providerKey: 'xero',
              displayName: 'Xero',
              description:
                'Xero cloud accounting platform — accounting and billing integrations via OAuth 2.0',
              channelIds: [accountingChannel._id, billingChannel._id],
              connectionType: 'oauth' as const,
              isActive: true,
            },
          ]
        : []),

      // ── Identity providers ───────────────────────────────────────────────
      ...(identityChannel
        ? [
            {
              providerKey: 'google_identity',
              displayName: 'Google',
              description:
                '"Sign in with Google" via OAuth 2.0 — Relay performs the consent flow and hands back the verified profile (email, name)',
              channelIds: [identityChannel._id],
              connectionType: 'oauth' as const,
              isActive: true,
            },
          ]
        : []),
    ];

    for (const p of providers) {
      // $addToSet with $each preserves existing channel associations and adds
      // any missing IDs without duplicates, on both insert and update.
      // $setOnInsert handles non-channel fields only on first insert.
      const { channelIds, ...rest } = p;
      const result = await this.providerModel.updateOne(
        { providerKey: p.providerKey },
        {
          $addToSet: { channelIds: { $each: channelIds } },
          $setOnInsert: rest,
        },
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
