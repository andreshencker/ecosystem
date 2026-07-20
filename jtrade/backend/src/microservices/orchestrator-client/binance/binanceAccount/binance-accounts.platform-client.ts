import { Injectable } from '@nestjs/common';
import {
  type HttpResult,
  OrchestratorHttpClient,
} from '../../orchestrator-http.client';

@Injectable()
export class BinanceAccountsPlatformClient extends OrchestratorHttpClient {
  private readonly base = '/binance/binance-accounts';

  constructor() {
    super({
      baseURL: process.env.ORCHESTRATOR_BASE_URL ?? '/orchestrator:3003',
      timeoutMs: 10_000,
    });
  }

  async listAll(
    params?: { platformId?: string },
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.get(this.base, {
      params: params?.platformId
        ? { platformId: params.platformId }
        : undefined,
      headers: this.buildHeaders(authHeader),
    });

    return this.normalize<any>(res);
  }

  async create(dto: any, authHeader?: string): Promise<HttpResult<any>> {
    const res = await this.http.post(this.base, dto, {
      headers: this.buildHeaders(authHeader),
    });

    return this.normalize<any>(res);
  }

  async getById(id: string, authHeader?: string): Promise<HttpResult<any>> {
    const res = await this.http.get(`${this.base}/${id}`, {
      headers: this.buildHeaders(authHeader),
    });

    return this.normalize<any>(res);
  }

  async setDefault(id: string, authHeader?: string): Promise<HttpResult<any>> {
    const res = await this.http.patch(`${this.base}/${id}/default`, null, {
      headers: this.buildHeaders(authHeader),
    });

    return this.normalize<any>(res);
  }

  async update(
    id: string,
    dto: any,
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.patch(`${this.base}/${id}`, dto, {
      headers: this.buildHeaders(authHeader),
    });

    return this.normalize<any>(res);
  }

  async remove(id: string, authHeader?: string): Promise<HttpResult<any>> {
    const res = await this.http.delete(`${this.base}/${id}`, {
      headers: this.buildHeaders(authHeader),
    });

    return this.normalize<any>(res);
  }
}
