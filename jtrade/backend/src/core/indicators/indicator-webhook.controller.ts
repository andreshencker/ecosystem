import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { SignalsService } from '../signals/signals.service';
import { IndicatorsService } from './indicators.service';

/**
 * Public TradingView webhook receiver. No auth guard — the 32-hex `slug` in the
 * path plus the per-alert `key` in the body are the credentials. Resolves the
 * alert channel and records the signal. Matching it to clients and delivering to
 * their EAs happens in the signalbots module.
 */
@Controller('webhooks/tv')
export class IndicatorWebhookController {
  constructor(
    private readonly indicators: IndicatorsService,
    private readonly signals: SignalsService,
  ) {}

  @Post(':slug')
  @HttpCode(200)
  async ingest(@Param('slug') slug: string, @Body() body: { key?: string; time?: string | number }) {
    const resolved = await this.indicators.ingestWebhook(slug, body?.key ?? '');
    if (!resolved.ok || !resolved.symbol) return { ok: false };

    const barTime = body?.time ? new Date(body.time) : null;
    const { created, signal } = await this.signals.ingest({
      indicatorId: resolved.indicatorId!,
      channelId: resolved.channelId!,
      action: resolved.action!,
      symbol: resolved.symbol,
      timeframe: resolved.timeframe!,
      barTime: barTime && !Number.isNaN(barTime.getTime()) ? barTime : null,
    });

    return {
      ok: true,
      created,
      signalId: signal.signalId,
      action: signal.action,
      symbol: signal.symbol,
      timeframe: signal.timeFrame,
    };
  }
}
