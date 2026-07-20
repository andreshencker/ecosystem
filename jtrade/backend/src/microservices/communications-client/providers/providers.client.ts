// src/controllers/communications/providers/providers.client.ts
import { Injectable } from '@nestjs/common';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

@Injectable()
export class ProvidersCommunicationsClient extends CommunicationsHttpClient {
  // 3001 controller: @Controller('providers')
  private readonly base = '/providers';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 10_000,
    });
  }

  async list(
    params?: { active?: boolean; channelId?: string; populate?: boolean },
    authHeader?: string,
  ): Promise<HttpResult<any[]>> {
    const res = await this.http.get(this.base, {
      params: {
        ...(typeof params?.active === 'boolean'
          ? { active: params.active }
          : {}),
        ...(params?.channelId ? { channelId: params.channelId } : {}),
        ...(typeof params?.populate === 'boolean'
          ? { populate: params.populate }
          : {}),
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any[]>(res);
  }

  async getById(id: string, authHeader?: string): Promise<HttpResult<any>> {
    const res = await this.http.get(`${this.base}/${id}`, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async create(dto: any, authHeader?: string): Promise<HttpResult<any>> {
    const res = await this.http.post(this.base, dto, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
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
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async remove(
    id: string,
    authHeader?: string,
  ): Promise<HttpResult<{ deleted: boolean }>> {
    const res = await this.http.delete(`${this.base}/${id}`, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<{ deleted: boolean }>(res);
  }
}
