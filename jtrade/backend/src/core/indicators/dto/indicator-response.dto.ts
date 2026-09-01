import type { Timeframe } from '../schemas/indicator.schema';

export class IndicatorPairResponseDto {
  /** Stable channel id — what client subscriptions reference. */
  id!: string;
  symbolId!: string;
  /** Resolved from the symbols collection at read time. */
  symbol!: string;
  timeframe!: Timeframe;
  /** Paste into the TradingView BUY alert. */
  buyKey!: string;
  /** Paste into the TradingView SELL alert. */
  sellKey!: string;
  enabled!: boolean;
  lastSignalAt!: Date | null;
}

export class IndicatorResponseDto {
  id!: string;
  providerOrganizationId!: string;
  name!: string;
  key!: string;
  description!: string;
  /** 32-hex slug for the public webhook path `/webhooks/tv/:slug`. */
  webhookSlug!: string;
  webhookLastReceivedAt!: Date | null;
  pairs!: IndicatorPairResponseDto[];
  isActive!: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
