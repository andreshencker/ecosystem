import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';

import { Signal, SignalAction, SignalDocument } from './schemas/signal.schema';

/** Per-timeframe windows, ported from the legacy signals.service. */
const COOLDOWN_MS: Record<string, number> = {
  M1: 60_000, M5: 300_000, M15: 900_000, M30: 1_800_000,
  H1: 3_600_000, H4: 14_400_000, D1: 86_400_000,
};
const EXPIRATION_MS: Record<string, number> = {
  M1: 30_000, M5: 60_000, M15: 120_000, M30: 180_000,
  H1: 300_000, H4: 600_000, D1: 1_800_000,
};

export const signalCooldownMs = (tf: string) => COOLDOWN_MS[tf?.toUpperCase()] ?? 900_000;
export const signalExpirationMs = (tf: string) => EXPIRATION_MS[tf?.toUpperCase()] ?? 120_000;

export type IngestInput = {
  indicatorId: string;
  channelId: string;
  action: 'BUY' | 'SELL';
  symbol: string;
  timeframe: string;
  barTime?: Date | null;
};

@Injectable()
export class SignalsService {
  private readonly log = new Logger(SignalsService.name);

  constructor(
    @InjectModel(Signal.name) private readonly signals: Model<SignalDocument>,
  ) {}

  /**
   * Records a signal. Deduplicates within the timeframe's cooldown window
   * (same channel + action) — if a recent one exists it's returned unchanged.
   */
  async ingest(input: IngestInput): Promise<{ created: boolean; signal: SignalDocument }> {
    const action = input.action as SignalAction;
    const symbol = input.symbol.trim().toUpperCase();
    const timeFrame = input.timeframe.trim().toUpperCase();
    const channelId = new Types.ObjectId(input.channelId);
    const now = new Date();

    const recent = await this.signals
      .findOne({
        channelId,
        action,
        createdAt: { $gte: new Date(now.getTime() - signalCooldownMs(timeFrame)) },
      })
      .sort({ createdAt: -1 })
      .exec();
    if (recent) {
      this.log.warn(`dedup ${symbol} ${timeFrame} ${action} — reusing ${recent.signalId}`);
      return { created: false, signal: recent };
    }

    const barTime = input.barTime ?? null;
    const expiryBase = barTime ?? now;
    const signal = await this.signals.create({
      signalId: randomUUID(),
      indicatorId: new Types.ObjectId(input.indicatorId),
      channelId,
      action,
      symbol,
      timeFrame,
      isActive: true,
      barTime,
      expiresAt: new Date(expiryBase.getTime() + signalExpirationMs(timeFrame)),
    });
    return { created: true, signal };
  }

  /** Latest active signal for a channel, newest first. */
  latestForChannel(channelId: string) {
    return this.signals
      .findOne({ channelId: new Types.ObjectId(channelId), isActive: true })
      .sort({ createdAt: -1 })
      .lean();
  }

  /** History for a set of indicators (provider view). */
  listByIndicators(indicatorIds: string[], limit = 200) {
    return this.signals
      .find({ indicatorId: { $in: indicatorIds.map((id) => new Types.ObjectId(id)) } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}
