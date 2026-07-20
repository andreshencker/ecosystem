// src/integrations/binance/orders/binance-orders.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BinanceClientFactory } from './binance-client.factory';

export type OrderPayload = Record<string, any>;

@Injectable()
export class BinanceOrdersService {
  private readonly log = new Logger(BinanceOrdersService.name);

  constructor(private readonly factory: BinanceClientFactory) {}

  // SPOT -> POST /api/v3/order
  async spotOrder(accountId: string, payload: OrderPayload) {
    const { http } = await this.factory.spot(accountId);
    try {
      const res = await http.post('/api/v3/order', null, {
        _signed: true,
        params: payload, // Binance espera querystring firmado
      });
      return res.data;
    } catch (e) {
      this.log.error('spotOrder failed', e);
      this.asHttpError(e, 'Failed to create SPOT order');
    }
  }

  /* ========== 1. ÓRDENES POR MERCADO ========== */

  // MARGIN (cross) -> POST /sapi/v1/margin/order
  async marginOrder(accountId: string, payload: OrderPayload) {
    const { http } = await this.factory.marginCross(accountId);
    try {
      const res = await http.post('/sapi/v1/margin/order', null, {
        _signed: true,
        params: payload,
      });
      return res.data;
    } catch (e) {
      this.log.error('marginOrder failed', e);
      this.asHttpError(e, 'Failed to create MARGIN order');
    }
  }

  // FUTURES USDT-M -> POST /fapi/v1/order
  async usdmOrder(accountId: string, payload: OrderPayload) {
    const { http } = await this.factory.fapi(accountId);
    try {
      const res = await http.post('/fapi/v1/order', null, {
        _signed: true,
        params: payload,
      });
      return res.data;
    } catch (e) {
      this.log.error('usdmOrder failed', e);
      this.asHttpError(e, 'Failed to create USDM order');
    }
  }

  // FUTURES COIN-M -> POST /dapi/v1/order
  async coinmOrder(accountId: string, payload: OrderPayload) {
    const { http } = await this.factory.dapi(accountId);
    try {
      const res = await http.post('/dapi/v1/order', null, {
        _signed: true,
        params: payload,
      });
      return res.data;
    } catch (e) {
      this.log.error('coinmOrder failed', e);
      this.asHttpError(e, 'Failed to create COINM order');
    }
  }

  // OPTIONS -> POST /eapi/v1/order
  async optionsOrder(accountId: string, payload: OrderPayload) {
    const { http } = await this.factory.eapi(accountId);
    try {
      const res = await http.post('/eapi/v1/order', null, {
        _signed: true,
        params: payload,
      });
      return res.data;
    } catch (e) {
      this.log.error('optionsOrder failed', e);
      this.asHttpError(e, 'Failed to create OPTIONS order');
    }
  }

  async allOrders(
    accountId: string,
    payloads: {
      spot?: OrderPayload;
      margin?: OrderPayload;
      usdm?: OrderPayload;
      coinm?: OrderPayload;
      options?: OrderPayload;
    },
  ) {
    // aquí mejor usar allSettled porque no quieres que una falle y tumbe todas
    const results = await Promise.allSettled([
      payloads.spot
        ? this.spotOrder(accountId, payloads.spot)
        : Promise.resolve(null),
      payloads.margin
        ? this.marginOrder(accountId, payloads.margin)
        : Promise.resolve(null),
      payloads.usdm
        ? this.usdmOrder(accountId, payloads.usdm)
        : Promise.resolve(null),
      payloads.coinm
        ? this.coinmOrder(accountId, payloads.coinm)
        : Promise.resolve(null),
      payloads.options
        ? this.optionsOrder(accountId, payloads.options)
        : Promise.resolve(null),
    ]);

    const [spot, margin, usdm, coinm, options] = results;

    return {
      spot,
      margin,
      usdm,
      coinm,
      options,
    };
  }

  /* ========== 2. AGRUPADOR (SI ALGÚN DÍA LO NECESITAS) ========== */

  private asHttpError(e: any, fallback: string) {
    const msg = this.factory.extractAxiosMessage(e, fallback);
    throw new HttpException(msg, HttpStatus.BAD_REQUEST);
  }
}
