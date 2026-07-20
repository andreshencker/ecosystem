// src/integrations/binance/binance-client.factory.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { BinanceAccountsService } from '../binance-accounts/binance-accounts.service';

type DecryptedCreds = { apiKey: string; apiSecret: string };

@Injectable()
export class BinanceClientFactory {
  private readonly log = new Logger(BinanceClientFactory.name);

  constructor(private readonly accounts: BinanceAccountsService) {}

  public sign(params: Record<string, any>, apiSecret: string): string {
    const signed = this.hmacSign(params, apiSecret);
    return new URLSearchParams(signed).toString();
  }

  async sapi(accountId: string): Promise<{ http: any; creds: DecryptedCreds }> {
    const creds = await this.getCreds(accountId);
    const http = this.buildHttp('https://api.binance.com', creds.apiKey);
    this.attachSigningInterceptor(http, creds.apiSecret);
    return { http, creds };
  }

  async spot(accountId: string) {
    return this.sapi(accountId);
  }

  async marginCross(accountId: string) {
    return this.sapi(accountId);
  }

  async marginIsolated(accountId: string) {
    return this.sapi(accountId);
  }

  /* 4.1 Core REST por dominio */

  async fapi(accountId: string): Promise<{ http: any; creds: DecryptedCreds }> {
    const creds = await this.getCreds(accountId);
    const http = this.buildHttp('https://fapi.binance.com', creds.apiKey);
    this.attachSigningInterceptor(http, creds.apiSecret);
    return { http, creds };
  }

  async dapi(accountId: string): Promise<{ http: any; creds: DecryptedCreds }> {
    const creds = await this.getCreds(accountId);
    const http = this.buildHttp('https://dapi.binance.com', creds.apiKey);
    this.attachSigningInterceptor(http, creds.apiSecret);
    return { http, creds };
  }

  async eapi(accountId: string): Promise<{ http: any; creds: DecryptedCreds }> {
    const creds = await this.getCreds(accountId);
    const http = this.buildHttp('https://eapi.binance.com', creds.apiKey);
    this.attachSigningInterceptor(http, creds.apiSecret);
    return { http, creds };
  }

  async papi(accountId: string): Promise<{ http: any; creds: DecryptedCreds }> {
    const creds = await this.getCreds(accountId);
    const http = this.buildHttp('https://papi.binance.com', creds.apiKey);
    this.attachSigningInterceptor(http, creds.apiSecret);
    return { http, creds };
  }

  async wallet(accountId: string) {
    return this.sapi(accountId);
  }

  async convert(accountId: string) {
    return this.sapi(accountId);
  }

  async loans(accountId: string) {
    return this.sapi(accountId);
  }

  async earn(accountId: string) {
    return this.sapi(accountId);
  }

  /* Wrappers semánticos SAPI */

  async staking(accountId: string) {
    return this.sapi(accountId);
  }

  async simpleEarn(accountId: string) {
    return this.sapi(accountId);
  }

  async subAccounts(accountId: string) {
    return this.sapi(accountId);
  }

  async fundingWallet(accountId: string) {
    return this.sapi(accountId);
  }

  extractAxiosMessage(e: any, fallback = 'Binance request failed'): string {
    const code = e?.response?.data?.code;
    const msg =
      e?.response?.data?.msg ||
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      fallback;

    return typeof code === 'number' ? `${msg} (code ${code})` : msg;
  }

  /* 1) Cargar y validar credenciales */
  private async getCreds(accountId: string): Promise<DecryptedCreds> {
    try {
      if (!accountId || typeof accountId !== 'string') {
        throw new HttpException('Invalid accountId', HttpStatus.BAD_REQUEST);
      }
      const creds = await this.accounts.getDecryptedCredsOrThrow(accountId);
      if (!creds?.apiKey || !creds?.apiSecret) {
        throw new HttpException(
          'Missing API credentials in account',
          HttpStatus.BAD_REQUEST,
        );
      }
      return creds;
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.log.error(`getCreds failed: ${e?.message ?? e}`);
      throw new HttpException(
        'Could not load credentials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* 2) Firma HMAC */
  private hmacSign(params: Record<string, any>, apiSecret: string) {
    const baseParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) baseParams[k] = String(v);
    }
    if (!baseParams.timestamp) baseParams.timestamp = String(Date.now());

    const qs = new URLSearchParams(baseParams).toString();
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(qs)
      .digest('hex');
    return { ...baseParams, signature };
  }

  /* 3) Interceptor para _signed */
  private attachSigningInterceptor(http: any, apiSecret: string) {
    http.interceptors.request.use((config: any) => {
      if (!config._signed) return config;

      const current = (config.params ?? {}) as Record<string, any>;
      const signed = this.hmacSign(current, apiSecret);
      config.params = signed;

      delete config._signed;
      return config;
    });
  }

  /* 5) Normalizador de errores */

  /* 4) Constructores de clientes */
  private buildHttp(baseURL: string, apiKey: string): any {
    return axios.create({
      baseURL,
      timeout: 15000,
      headers: { 'X-MBX-APIKEY': apiKey },
    });
  }
}
