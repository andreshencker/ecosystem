// src/notifications/notification.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import { EventCatalogueService } from './events/event-catalogue/event-catalogue.service';
import { ChannelsImplementationFactory } from '../channels/implementation/channels-implementation.factory';
import { ChannelsRuntimeResolverService } from '../channels/runtime/channels-runtime-resolver.service';

import { NotificationRenderService } from './render/notification-render.service';
import { ExecutionLogService } from './execution-log/execution-log.service';

import { NotifyEventDto } from './dto/notify-event.dto';
import { NotificationResultDto } from './dto/notification-result.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import type { DeliveryStatus, ExecutionChannel, RenderStatus } from './execution-log/schemas/execution-log.schema';

// Internal type carrying execution context for logging — never exposed externally
type ChannelExecutionCtx = {
  channel: ExecutionChannel;
  layoutTemplateId: string | null;
  themeId: string | null;
  renderStatus: RenderStatus;
  deliveryStatus: DeliveryStatus;
  renderedAt: Date | null;
  sentAt: Date | null;
  providerMessageId: string | null;
  errorMessage: string | null;
};

type ChannelHandlerOutcome = {
  result: NotificationResultDto;
  ctx: ChannelExecutionCtx;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly eventCatalogue: EventCatalogueService,
    private readonly runtime: ChannelsRuntimeResolverService,
    private readonly implFactory: ChannelsImplementationFactory,
    private readonly renderer: NotificationRenderService,
    private readonly executionLog: ExecutionLogService,
  ) {}

  async notifyEvent(dto: NotifyEventDto): Promise<{
    eventKey: string;
    companyId: string;
    results: NotificationResultDto[];
  }> {
    const rawEvent = String(dto.event ?? '').trim().toLowerCase();
    this.logger.log(`[notifyEvent:TRACE] ── START ── event="${rawEvent}"  companyId="${dto.companyId}"  email="${dto.email}"`);
    if (!rawEvent) {
      this.logger.log('[notifyEvent:TRACE] THROW: event is required');
      throw new HttpException('event is required', HttpStatus.BAD_REQUEST);
    }

    const companyId = String(dto.companyId ?? '').trim();
    if (!companyId) {
      this.logger.log('[notifyEvent:TRACE] THROW: companyId is required');
      throw new HttpException('companyId is required', HttpStatus.BAD_REQUEST);
    }

    // 1) Resolve event — canonical key ("security.user_invitation") or bare key ("user_invitation")
    let event: any;
    if (rawEvent.includes('.')) {
      // Canonical path: domain-aware lookup (DEC-018 §6)
      event = await this.eventCatalogue.findByCompanyAndCanonicalKey(
        companyId,
        rawEvent,
      );
    } else {
      // Bare key path: backwards-compatible lookup
      event = await this.eventCatalogue.findByCompanyAndEventKey({
        companyId,
        eventKey: rawEvent,
        populateChannelsRuntime: false,
      });
    }

    // Bare event key from the resolved document (never contains domain prefix)
    const eventKey = String(event?.eventKey ?? rawEvent).toLowerCase().trim();

    // 2) data (compatibilidad {{data.xxx}})
    const payloadData =
      dto.payload &&
      typeof (dto.payload as any).data === 'object' &&
      (dto.payload as any).data
        ? (dto.payload as any).data
        : {};

    const templateData: Record<string, any> = {
      ...(dto.variables ?? {}),
      ...(payloadData ?? {}),
    };

    // 3) Resolve domain metadata (for logging and execution log — NOT the decision source)
    const domain = (event as any).domainCatalogueId;
    const domainKey = String(domain?.domainKey ?? '').toLowerCase().trim();
    const canonicalEventKey = domainKey ? `${domainKey}.${eventKey}` : eventKey;

    // domain.channelsToUse is read as a SECONDARY source: if an explicit
    // providerCredentialsId is assigned for a channel, use it.
    // Otherwise fall back to resolveDefault() — see step 4b below.
    const domainAssignments: Record<string, string> = {};
    if (Array.isArray(domain?.channelsToUse)) {
      for (const x of domain.channelsToUse) {
        const ch = String(x?.channel ?? '').toLowerCase().trim();
        const pcId = String(x?.providerCredentialsId ?? '').trim();
        if (ch && pcId) domainAssignments[ch] = pcId;
      }
    }

    this.logger.log(
      `[notifyEvent:TRACE] event resolved: eventKey="${eventKey}"  domainKey="${domainKey}"  ` +
      `domainAssignments=${JSON.stringify(domainAssignments)}`,
    );

    // ── Step 3b: build dispatch list from event.channelContent (PRIMARY decision source) ──
    //
    // The event drives the decision. If event.channelContent.email.enabled is true,
    // we attempt email delivery regardless of domain.channelsToUse being empty.
    // Credential resolution:
    //   a. domain.channelsToUse has a specific providerCredentialsId → use it (step 4a)
    //   b. no assignment → resolveDefault(companyId, channelKey)       (step 4b)

    const channelsToDispatch: Array<{ channel: 'email' | 'sms'; providerCredentialsId: string }> = [];

    for (const chKey of ['email', 'sms'] as const) {
      const content = (event as any).channelContent?.[chKey];

      this.logger.log(
        `[DIAG:notifyEvent] channelContent["${chKey}"]: present=${!!content}  ` +
        `enabled=${content?.enabled ?? '(not set — default true)'}  ` +
        `subject=${content?.subject ? `"${String(content.subject).slice(0, 40)}..."` : '(none)'}`,
      );

      // Skip if channel is explicitly absent or disabled
      if (!content || content.enabled === false) {
        this.logger.log(`[DIAG:notifyEvent] SKIP channel="${chKey}": not configured or disabled in event.channelContent`);
        continue;
      }

      const assignedCredId = domainAssignments[chKey] ?? '';
      channelsToDispatch.push({ channel: chKey, providerCredentialsId: assignedCredId });

      this.logger.log(
        `[DIAG:notifyEvent] DISPATCH channel="${chKey}"  ` +
        `credentialSource=${assignedCredId
          ? `domain assignment → providerCredentialsId="${assignedCredId}"`
          : 'resolveDefault() — no domain.channelsToUse entry for this channel'}`,
      );
    }

    this.logger.log(
      `[DIAG:notifyEvent] ── dispatch summary ──\n` +
      `  companyId:          ${companyId}\n` +
      `  canonicalEventKey:  ${canonicalEventKey}\n` +
      `  channelsToDispatch: ${JSON.stringify(channelsToDispatch)}`,
    );

    if (channelsToDispatch.length === 0) {
      this.logger.log(
        `[notifyEvent:TRACE] THROW: event "${canonicalEventKey}" has no enabled channels in channelContent`,
      );
      throw new HttpException(
        `Event "${canonicalEventKey}" has no enabled email/sms channels configured in channelContent`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const leavePlaceholders = process.env.LEAVE_DATA_PLACEHOLDERS === 'true';
    const results: NotificationResultDto[] = [];

    for (const item of channelsToDispatch) {
      const channelKey = item.channel;
      const channel = channelKey as ExecutionChannel;
      const assignedCredId = item.providerCredentialsId;

      this.logger.log(
        `[notifyEvent:TRACE] LOOP channel="${channelKey}"  ` +
        `assignedCredId="${assignedCredId || '(none — will use resolveDefault)'}"`,
      );

      // 4) Resolve runtime credentials
      //    4a. specific assignment from domain.channelsToUse
      //    4b. default active credential for the company + channel (fallback)
      let ch: any;
      try {
        if (assignedCredId) {
          this.logger.log(
            `[DIAG:notifyEvent] step 4a — resolveByProviderCredentialsId("${assignedCredId}")`,
          );
          ch = await this.runtime.resolveByProviderCredentialsId({
            companyId,
            providerCredentialsId: assignedCredId,
          });
        } else {
          this.logger.log(
            `[DIAG:notifyEvent] step 4b — resolveDefault(companyId="${companyId}", channelKey="${channelKey}")`,
          );
          ch = await this.runtime.resolveDefault({ companyId, channelKey });
        }

        this.logger.log(
          `[DIAG:notifyEvent] credential resolved:\n` +
          `  providerCredentialsId: ${ch?.providerCredentialsId}\n` +
          `  providerKey:           ${ch?.providerKey}\n` +
          `  connectionType:        ${ch?.connectionType}\n` +
          `  isActive:              ${ch?.isActive}`,
        );
        this.logger.log(
          `[notifyEvent:TRACE] runtime resolved: provider="${ch?.providerKey}"  connectionType="${ch?.connectionType}"  isActive=${ch?.isActive}`,
        );
      } catch (err: any) {
        this.logger.log(`[notifyEvent:TRACE] CONTINUE: runtime resolve threw: "${err?.message}"`);

        const r: NotificationResultDto = {
          channel: channel === 'email' ? 'EMAIL' : 'SMS',
          provider: channelKey,
          success: false,
          error: err?.message ?? 'Failed to resolve channel runtime',
        };
        results.push(r);
        this.writeLog({
          companyId, domainKey, eventKey, canonicalEventKey, channel,
          layoutTemplateId: null, themeId: null,
          providerId: null, providerCredentialsId: assignedCredId || null,
          renderStatus: 'failed', deliveryStatus: 'skipped',
          renderedAt: null, sentAt: null,
          providerMessageId: null,
          errorMessage: r.error ?? null,
        });
        continue;
      }

      if (ch?.isActive === false) {
        this.logger.log('[notifyEvent:TRACE] CONTINUE: ch.isActive===false (safety-net path)');
        const r: NotificationResultDto = {
          channel: channel === 'email' ? 'EMAIL' : 'SMS',
          provider: String(ch.providerKey ?? channelKey),
          success: false,
          error: 'Provider or credential is inactive — check Enabled Providers and Credentials pages',
        };
        results.push(r);
        this.writeLog({
          companyId, domainKey, eventKey, canonicalEventKey, channel,
          layoutTemplateId: null, themeId: null,
          providerId: ch.providerId ?? null, providerCredentialsId: ch.providerCredentialsId ?? null,
          renderStatus: 'failed', deliveryStatus: 'skipped',
          renderedAt: null, sentAt: null,
          providerMessageId: null,
          errorMessage: r.error ?? null,
        });
        continue;
      }

      // channelContent already verified in step 3 — guaranteed to exist and be enabled
      const channelContent = (event as any).channelContent?.[channelKey];
      this.logger.log(
        `[notifyEvent:TRACE] channelContent["${channelKey}"]: present=${!!channelContent}  enabled=${channelContent?.enabled}`,
      );
      if (!channelContent || channelContent.enabled === false) {
        this.logger.log(`[notifyEvent:TRACE] CONTINUE: channelContent missing or disabled`);
        const r: NotificationResultDto = {
          channel: channel === 'email' ? 'EMAIL' : 'SMS',
          provider: String(ch.providerKey ?? channelKey),
          success: false,
          error: channelContent
            ? `Channel "${channelKey}" is disabled on event "${eventKey}"`
            : `Event "${eventKey}" has no ${channelKey} channel content configured`,
        };
        results.push(r);
        this.writeLog({
          companyId, domainKey, eventKey, canonicalEventKey, channel,
          layoutTemplateId: null, themeId: null,
          providerId: ch.providerId ?? null, providerCredentialsId: ch.providerCredentialsId ?? null,
          renderStatus: 'failed', deliveryStatus: 'skipped',
          renderedAt: null, sentAt: null,
          providerMessageId: null,
          errorMessage: r.error ?? null,
        });
        continue;
      }

      // 6) required variables
      const required = Array.isArray(channelContent.requiredVariables)
        ? channelContent.requiredVariables
        : [];

      const missing = required.filter((path: string) => {
        const v = this.getPathValue(
          { data: templateData, payload: dto.payload ?? {} },
          path,
        );
        return v === undefined || v === null || v === '';
      });

      this.logger.log(`[notifyEvent:TRACE] required vars check: required=${JSON.stringify(required)}  missing=${JSON.stringify(missing)}`);
      if (missing.length) {
        this.logger.log(`[notifyEvent:TRACE] CONTINUE: missing required variables: ${missing.join(', ')}`);
        const r: NotificationResultDto = {
          channel: channel === 'email' ? 'EMAIL' : 'SMS',
          provider: String(ch.providerKey ?? channelKey),
          success: false,
          error: `Missing required variables: ${missing.join(', ')}`,
        };
        results.push(r);
        this.writeLog({
          companyId, domainKey, eventKey, canonicalEventKey, channel,
          layoutTemplateId: null, themeId: null,
          providerId: ch.providerId ?? null,
          providerCredentialsId: ch.providerCredentialsId,
          renderStatus: 'failed', deliveryStatus: 'skipped',
          renderedAt: null, sentAt: null,
          providerMessageId: null,
          errorMessage: r.error ?? null,
        });
        continue;
      }

      this.logger.log(`[notifyEvent:TRACE] dispatching to channelKey="${channelKey}"`);
      if (channelKey === 'email') {
        const outcome = await this.handleEmailWithLayout(
          event, ch, dto, companyId, templateData, leavePlaceholders,
        );
        this.logger.log(
          `[notifyEvent:TRACE] email outcome: success=${outcome.result.success}  error="${outcome.result.error ?? 'none'}"  renderStatus=${outcome.ctx.renderStatus}  deliveryStatus=${outcome.ctx.deliveryStatus}`,
        );
        results.push(outcome.result);
        this.writeLog({
          companyId, domainKey, eventKey, canonicalEventKey,
          channel: outcome.ctx.channel,
          layoutTemplateId: outcome.ctx.layoutTemplateId,
          themeId: outcome.ctx.themeId,
          providerId: ch.providerId ?? null,
          providerCredentialsId: ch.providerCredentialsId,
          renderStatus: outcome.ctx.renderStatus,
          deliveryStatus: outcome.ctx.deliveryStatus,
          renderedAt: outcome.ctx.renderedAt,
          sentAt: outcome.ctx.sentAt,
          providerMessageId: outcome.ctx.providerMessageId,
          errorMessage: outcome.ctx.errorMessage,
        });
        continue;
      }

      if (channelKey === 'sms') {
        const outcome = await this.handleSms(
          event, ch, dto, templateData, leavePlaceholders,
        );
        results.push(outcome.result);
        this.writeLog({
          companyId, domainKey, eventKey, canonicalEventKey,
          channel: outcome.ctx.channel,
          layoutTemplateId: null,
          themeId: null,
          providerId: ch.providerId ?? null,
          providerCredentialsId: ch.providerCredentialsId,
          renderStatus: outcome.ctx.renderStatus,
          deliveryStatus: outcome.ctx.deliveryStatus,
          renderedAt: outcome.ctx.renderedAt,
          sentAt: outcome.ctx.sentAt,
          providerMessageId: outcome.ctx.providerMessageId,
          errorMessage: outcome.ctx.errorMessage,
        });
        continue;
      }
    }

    this.logger.log(`[notifyEvent:TRACE] loop complete. results.length=${results.length}  results=${JSON.stringify(results)}`);

    if (results.length === 0) {
      this.logger.log('[notifyEvent:TRACE] THROW: no results produced');
      throw new HttpException(
        'No enabled EMAIL/SMS channels produced any action',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log('[notifyEvent:TRACE] ── RETURN ── ' + JSON.stringify({ eventKey, companyId, results }));
    return { eventKey, companyId, results };
  }

  // ==========================
  // ✅ EMAIL con Layout DEFAULT (por companyId)
  // ==========================
  private async handleEmailWithLayout(
    event: any,
    ch: any,
    dto: NotifyEventDto,
    companyId: string,
    templateData: Record<string, any>,
    leavePlaceholders: boolean,
  ): Promise<ChannelHandlerOutcome> {
    const ctx: ChannelExecutionCtx = {
      channel: 'email',
      layoutTemplateId: null,
      themeId: null,
      renderStatus: 'failed',
      deliveryStatus: 'skipped',
      renderedAt: null,
      sentAt: null,
      providerMessageId: null,
      errorMessage: null,
    };

    if (!dto.email) {
      ctx.errorMessage = 'Missing email destination';
      return {
        result: {
          channel: 'EMAIL',
          provider: String(ch.providerKey ?? 'email'),
          success: false,
          error: ctx.errorMessage,
        },
        ctx,
      };
    }

    // ── Rendering phase — delegated to NotificationRenderService (shared with preview) ────────
    let rendered: { subject: string; html: string; layoutTemplateId: string | null; themeId: string | null };
    try {
      rendered = await this.renderer.renderEmail({
        companyId,
        eventKey: String(event?.eventKey ?? '').trim().toLowerCase(),
        data: templateData,
        leavePlaceholders,
      });
    } catch (err: any) {
      ctx.renderStatus = 'failed';
      ctx.deliveryStatus = 'skipped';
      ctx.errorMessage = err?.message ?? 'Render failed';
      return {
        result: {
          channel: 'EMAIL',
          provider: String(ch.providerKey ?? 'email'),
          success: false,
          error: ctx.errorMessage,
        },
        ctx,
      };
    }

    ctx.renderStatus = 'success';
    ctx.renderedAt = new Date();
    ctx.deliveryStatus = 'pending';
    ctx.layoutTemplateId = rendered.layoutTemplateId;
    ctx.themeId = rendered.themeId;

    // ── Delivery phase ─────────────────────────────────────────────────────────
    const payload: SendEmailDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    } = {
      to: dto.email,
      subject: rendered.subject,
      html: rendered.html,
      credentials: ch.credentials ?? {},
      providerKey: ch.providerKey,
    };

    try {
      const emailChannel = this.implFactory.getEmailChannel(
        String(ch.connectionType ?? ''),
        String(ch.providerKey ?? ''),
      );

      const res = await emailChannel.sendEmail(payload);
      const success = !!res.success;

      ctx.deliveryStatus = success ? 'sent' : 'failed';
      ctx.sentAt = success ? new Date() : null;
      ctx.providerMessageId = (res as any).providerMessageId ?? null;
      ctx.errorMessage = res.error ?? null;

      return {
        result: {
          channel: 'EMAIL',
          provider: res.provider ?? String(ch.providerKey ?? 'email'),
          success,
          error: res.error ?? null,
        },
        ctx,
      };
    } catch (err: any) {
      this.logger.error(`EMAIL failed: ${err?.message}`, err?.stack);
      ctx.deliveryStatus = 'failed';
      ctx.errorMessage = err?.message ?? 'Unknown email error';
      return {
        result: {
          channel: 'EMAIL',
          provider: String(ch.providerKey ?? 'email'),
          success: false,
          error: ctx.errorMessage,
        },
        ctx,
      };
    }
  }

  // ==========================
  // SMS (sin layout)
  // ==========================
  private async handleSms(
    event: any,
    ch: any,
    dto: NotifyEventDto,
    templateData: Record<string, any>,
    leavePlaceholders: boolean,
  ): Promise<ChannelHandlerOutcome> {
    const ctx: ChannelExecutionCtx = {
      channel: 'sms',
      layoutTemplateId: null,
      themeId: null,
      renderStatus: 'failed',
      deliveryStatus: 'skipped',
      renderedAt: null,
      sentAt: null,
      providerMessageId: null,
      errorMessage: null,
    };

    if (!dto.phone) {
      ctx.errorMessage = 'Missing phone destination';
      return {
        result: {
          channel: 'SMS',
          provider: String(ch.providerKey ?? 'sms'),
          success: false,
          error: ctx.errorMessage,
        },
        ctx,
      };
    }

    // ── Rendering phase (no layout for SMS) ────────────────────────────────────
    const content = event.channelContent?.sms;
    const textTpl = String(content?.text ?? content?.content ?? '');

    let text: string;
    try {
      text = this.simpleTpl(
        textTpl,
        { data: templateData, payload: dto.payload ?? {} },
        leavePlaceholders,
      );
    } catch (err: any) {
      ctx.renderStatus = 'failed';
      ctx.deliveryStatus = 'skipped';
      ctx.errorMessage = err?.message ?? 'SMS template render failed';
      return {
        result: {
          channel: 'SMS',
          provider: String(ch.providerKey ?? 'sms'),
          success: false,
          error: ctx.errorMessage,
        },
        ctx,
      };
    }

    ctx.renderStatus = 'success';
    ctx.renderedAt = new Date();
    ctx.deliveryStatus = 'pending';

    // ── Delivery phase ─────────────────────────────────────────────────────────
    const payload: SendSmsDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    } = {
      to: dto.phone,
      text,
      credentials: ch.credentials ?? {},
      providerKey: ch.providerKey,
    };

    try {
      const smsChannel = this.implFactory.getSmsChannel(
        String(ch.connectionType ?? ''),
        String(ch.providerKey ?? ''),
      );

      const res = await smsChannel.sendSms(payload);
      const success = !!res.success;

      ctx.deliveryStatus = success ? 'sent' : 'failed';
      ctx.sentAt = success ? new Date() : null;
      ctx.providerMessageId = (res as any).providerMessageId ?? null;
      ctx.errorMessage = res.error ?? null;

      return {
        result: {
          channel: 'SMS',
          provider: res.provider ?? String(ch.providerKey ?? 'sms'),
          success,
          error: res.error ?? null,
        },
        ctx,
      };
    } catch (err: any) {
      this.logger.error(`SMS failed: ${err?.message}`, err?.stack);
      ctx.deliveryStatus = 'failed';
      ctx.errorMessage = err?.message ?? 'Unknown sms error';
      return {
        result: {
          channel: 'SMS',
          provider: String(ch.providerKey ?? 'sms'),
          success: false,
          error: ctx.errorMessage,
        },
        ctx,
      };
    }
  }

  // ==========================
  // Fire-and-forget log write — notification result is never blocked
  // ==========================
  private writeLog(params: {
    companyId: string;
    domainKey: string;
    eventKey: string;
    canonicalEventKey: string;
    channel: ExecutionChannel;
    layoutTemplateId: string | null;
    themeId: string | null;
    providerId: string | null;
    providerCredentialsId: string | null;
    renderStatus: RenderStatus;
    deliveryStatus: DeliveryStatus;
    renderedAt: Date | null;
    sentAt: Date | null;
    providerMessageId: string | null;
    errorMessage: string | null;
  }): void {
    this.executionLog
      .create(params)
      .catch((err) =>
        this.logger.warn(
          `Execution log write failed — notification unaffected: ${err?.message}`,
        ),
      );
  }

  // ==========================
  // Template simple (solo para SMS o validaciones)
  // ==========================
  private simpleTpl(
    tpl: string,
    ctx: any,
    leaveDataPlaceholders = false,
  ): string {
    if (!tpl) return '';

    return tpl.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, path) => {
      const key = String(path ?? '').trim();
      const v = this.getPathValue(ctx, key);

      if (
        leaveDataPlaceholders &&
        key.startsWith('data.') &&
        (v === undefined || v === null || v === '')
      ) {
        return match;
      }
      return v === undefined || v === null ? '' : String(v);
    });
  }

  private getPathValue(obj: any, path: string): any {
    const parts = String(path ?? '').split('.');
    let cur = obj;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = cur[p];
    }
    return cur;
  }
}
