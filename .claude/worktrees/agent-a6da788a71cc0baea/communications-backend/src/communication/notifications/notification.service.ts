// src/notifications/notification.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import { EventCatalogueService } from './events/event-catalogue/event-catalogue.service';
import { ChannelsImplementationFactory } from '../channels/implementation/channels-implementation.factory';
import { ChannelsRuntimeResolverService } from '../channels/runtime/channels-runtime-resolver.service';

import { SourceOfTruthService } from '../common/source-of-truth/source-of-truth.service';
import { TemplateComposerService } from '../common/template-engine/template-composer.service';

import { NotifyEventDto } from './dto/notify-event.dto';
import { NotificationResultDto } from './dto/notification-result.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly eventCatalogue: EventCatalogueService,
    private readonly runtime: ChannelsRuntimeResolverService,
    private readonly implFactory: ChannelsImplementationFactory,
    private readonly sot: SourceOfTruthService,
    private readonly composer: TemplateComposerService,
  ) {}

  async notifyEvent(dto: NotifyEventDto): Promise<{
    eventKey: string;
    companyId: string;
    results: NotificationResultDto[];
  }> {
    const eventKey = String(dto.event ?? '')
      .trim()
      .toLowerCase();
    if (!eventKey)
      throw new HttpException('event is required', HttpStatus.BAD_REQUEST);

    const companyId = String(dto.companyId ?? '').trim();
    if (!companyId)
      throw new HttpException('companyId is required', HttpStatus.BAD_REQUEST);

    // 1) evento
    const event = await this.eventCatalogue.findByCompanyAndEventKey({
      companyId,
      eventKey,
      populateChannelsRuntime: false,
    });

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

    // 3) channels to use
    const domain = (event as any).domainCatalogueId;
    const channelsToUse = Array.isArray(domain?.channelsToUse)
      ? domain.channelsToUse
      : [];
    if (channelsToUse.length === 0) {
      throw new HttpException(
        'Domain has no channelsToUse configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const leavePlaceholders = process.env.LEAVE_DATA_PLACEHOLDERS === 'true';
    const results: NotificationResultDto[] = [];

    for (const item of channelsToUse) {
      const channelKey = String(item?.channel ?? '')
        .toLowerCase()
        .trim();
      const providerCredentialsId = String(
        item?.providerCredentialsId ?? '',
      ).trim();

      if (channelKey !== 'email' && channelKey !== 'sms') continue;

      if (!providerCredentialsId) {
        results.push({
          channel: channelKey === 'email' ? 'EMAIL' : 'SMS',
          provider: channelKey,
          success: false,
          error: 'Missing providerCredentialsId in domain.channelsToUse',
        });
        continue;
      }

      // 4) runtime credentials
      let ch: any;
      try {
        ch = await this.runtime.resolveByProviderCredentialsId({
          companyId,
          providerCredentialsId,
        });
      } catch (err: any) {
        results.push({
          channel: channelKey === 'email' ? 'EMAIL' : 'SMS',
          provider: channelKey,
          success: false,
          error: err?.message ?? 'Failed to resolve channel runtime',
        });
        continue;
      }

      if (ch?.isActive === false) continue;

      // 5) channel content enabled
      const channelContent = (event as any).channelContent?.[channelKey];
      if (!channelContent || channelContent.enabled === false) continue;

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

      if (missing.length) {
        results.push({
          channel: channelKey === 'email' ? 'EMAIL' : 'SMS',
          provider: String(ch.providerKey ?? channelKey),
          success: false,
          error: `Missing required variables: ${missing.join(', ')}`,
        });
        continue;
      }

      if (channelKey === 'email') {
        results.push(
          await this.handleEmailWithLayout(
            event,
            ch,
            dto,
            companyId,
            templateData,
            leavePlaceholders,
          ),
        );
        continue;
      }

      if (channelKey === 'sms') {
        results.push(
          await this.handleSms(event, ch, dto, templateData, leavePlaceholders),
        );
        continue;
      }
    }

    if (results.length === 0) {
      throw new HttpException(
        'No enabled EMAIL/SMS channels produced any action',
        HttpStatus.BAD_REQUEST,
      );
    }

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
  ): Promise<NotificationResultDto> {
    if (!dto.email) {
      return {
        channel: 'EMAIL',
        provider: String(ch.providerKey ?? 'email'),
        success: false,
        error: 'Missing email destination',
      };
    }

    // ✅ SOT: default theme + default layout(email) (por companyId) + event content(email)
    const resolved = await this.sot.resolveForEmailNotificationByEventKey({
      companyId,
      eventKey: String(event?.eventKey ?? '')
        .trim()
        .toLowerCase(),
      data: templateData,
    });

    const layout = resolved.render.layout ?? {};
    if (!layout?.html) {
      return {
        channel: 'EMAIL',
        provider: String(ch.providerKey ?? 'email'),
        success: false,
        error: 'Default email layout not found',
      };
    }

    const subjectTpl = String(resolved.subjectTpl ?? '');
    const contentTpl = String(resolved.contentHtmlTpl ?? '');

    // Subject: solo variables (sin layout)
    const subject = this.composer.compose({
      layoutHtml: subjectTpl,
      layoutCss: '',
      contentHtml: '',
      context: {
        company: resolved.render.company,
        theme: resolved.render.theme,
      },
      data: resolved.render.data,
      meta: resolved.render.meta,
      leaveDataPlaceholders: leavePlaceholders,
    });

    // HTML final: layout + content
    const htmlFinal = this.composer.compose({
      layoutHtml: layout.html,
      layoutCss: layout.css ?? '',
      contentHtml: contentTpl,
      context: {
        company: resolved.render.company,
        theme: resolved.render.theme,
      },
      data: resolved.render.data,
      meta: resolved.render.meta,
      leaveDataPlaceholders: leavePlaceholders,
    });

    const payload: SendEmailDto & {
      credentials: Record<string, any>;
      providerKey?: string;
    } = {
      to: dto.email,
      subject,
      html: htmlFinal,
      credentials: ch.credentials ?? {},
      providerKey: ch.providerKey,
    };

    try {
      const emailChannel = this.implFactory.getEmailChannel(
        String(ch.connectionType ?? ''),
        String(ch.providerKey ?? ''),
      );

      const res = await emailChannel.sendEmail(payload);

      return {
        channel: 'EMAIL',
        provider: res.provider ?? String(ch.providerKey ?? 'email'),
        success: !!res.success,
        error: res.error ?? null,
      };
    } catch (err: any) {
      this.logger.error(`EMAIL failed: ${err?.message}`, err?.stack);
      return {
        channel: 'EMAIL',
        provider: String(ch.providerKey ?? 'email'),
        success: false,
        error: err?.message ?? 'Unknown email error',
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
  ): Promise<NotificationResultDto> {
    if (!dto.phone) {
      return {
        channel: 'SMS',
        provider: String(ch.providerKey ?? 'sms'),
        success: false,
        error: 'Missing phone destination',
      };
    }

    const content = event.channelContent?.sms;
    const textTpl = String(content?.text ?? content?.content ?? '');

    // SMS: solo variables, no layout
    const text = this.simpleTpl(
      textTpl,
      { data: templateData, payload: dto.payload ?? {} },
      leavePlaceholders,
    );

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

      return {
        channel: 'SMS',
        provider: res.provider ?? String(ch.providerKey ?? 'sms'),
        success: !!res.success,
        error: res.error ?? null,
      };
    } catch (err: any) {
      this.logger.error(`SMS failed: ${err?.message}`, err?.stack);
      return {
        channel: 'SMS',
        provider: String(ch.providerKey ?? 'sms'),
        success: false,
        error: err?.message ?? 'Unknown sms error',
      };
    }
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
