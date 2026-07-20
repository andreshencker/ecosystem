// src/integrations/binance/trades/binance-trades.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BinanceClientFactory } from './binance-client.factory';

export interface TradeQueryParams {
  symbol?: string;
  startTime?: number; // ms
  endTime?: number; // ms
  fromId?: number;
  limit?: number;
}

@Injectable()
export class BinanceTradesService {
  private readonly log = new Logger(BinanceTradesService.name);

  constructor(private readonly factory: BinanceClientFactory) {}

  // SPOT -> /api/v3/myTrades
  async spotTrades(accountId: string, q: TradeQueryParams = {}) {
    const { http } = await this.factory.spot(accountId);
    try {
      const res = await http.get('/api/v3/myTrades', {
        _signed: true,
        params: {
          symbol: q.symbol,
          startTime: q.startTime,
          endTime: q.endTime,
          fromId: q.fromId,
          limit: q.limit ?? 1000,
        },
      });
      return res.data;
    } catch (e) {
      this.log.error('spotTrades failed', e);
      this.asHttpError(e, 'Failed to fetch SPOT trades');
    }
  }

  /* ========== 1. TRADES POR MERCADO ========== */

  // MARGIN (cross) -> /sapi/v1/margin/myTrades
  async marginTrades(accountId: string, q: TradeQueryParams = {}) {
    const { http } = await this.factory.marginCross(accountId);
    try {
      const res = await http.get('/sapi/v1/margin/myTrades', {
        _signed: true,
        params: {
          symbol: q.symbol,
          startTime: q.startTime,
          endTime: q.endTime,
          fromId: q.fromId,
          limit: q.limit ?? 1000,
        },
      });
      return res.data;
    } catch (e) {
      this.log.error('marginTrades failed', e);
      this.asHttpError(e, 'Failed to fetch MARGIN trades');
    }
  }

  // FUTURES USDT-M -> /fapi/v1/userTrades
  async usdmTrades(accountId: string, q: TradeQueryParams = {}) {
    const { http } = await this.factory.fapi(accountId);
    try {
      const res = await http.get('/fapi/v1/userTrades', {
        _signed: true,
        params: {
          symbol: q.symbol,
          startTime: q.startTime,
          endTime: q.endTime,
          fromId: q.fromId,
          limit: q.limit ?? 1000,
        },
      });
      return res.data;
    } catch (e) {
      this.log.error('usdmTrades failed', e);
      this.asHttpError(e, 'Failed to fetch USDT-M trades');
    }
  }

  // FUTURES COIN-M -> /dapi/v1/userTrades
  async coinmTrades(accountId: string, q: TradeQueryParams = {}) {
    const { http } = await this.factory.dapi(accountId);
    try {
      const res = await http.get('/dapi/v1/userTrades', {
        _signed: true,
        params: {
          symbol: q.symbol,
          startTime: q.startTime,
          endTime: q.endTime,
          fromId: q.fromId,
          limit: q.limit ?? 1000,
        },
      });
      return res.data;
    } catch (e) {
      this.log.error('coinmTrades failed', e);
      this.asHttpError(e, 'Failed to fetch COIN-M trades');
    }
  }

  // OPTIONS -> /eapi/v1/userTrades
  async optionsTrades(accountId: string, q: TradeQueryParams = {}) {
    const { http } = await this.factory.eapi(accountId);
    try {
      const res = await http.get('/eapi/v1/userTrades', {
        _signed: true,
        params: {
          symbol: q.symbol,
          startTime: q.startTime,
          endTime: q.endTime,
          fromId: q.fromId,
          limit: q.limit ?? 1000,
        },
      });
      return res.data;
    } catch (e) {
      this.log.error('optionsTrades failed', e);
      this.asHttpError(e, 'Failed to fetch OPTIONS trades');
    }
  }

  async allTrades(accountId: string, q: TradeQueryParams = {}) {
    // Si quieres evitar que falle todo cuando un mercado da error → usar allSettled
    const [spot, margin, usdm, coinm, options] = await Promise.all([
      this.spotTrades(accountId, q),
      this.marginTrades(accountId, q),
      this.usdmTrades(accountId, q),
      this.coinmTrades(accountId, q),
      this.optionsTrades(accountId, q),
    ]);

    return {
      spot,
      margin,
      usdm,
      coinm,
      options,
    };
  }

  /* ========== 2. AGRUPADOR: TODOS LOS MERCADOS ========== */

  private asHttpError(e: any, fallback: string) {
    const msg = this.factory.extractAxiosMessage(e, fallback);
    throw new HttpException(msg, HttpStatus.BAD_REQUEST);
  }
}
