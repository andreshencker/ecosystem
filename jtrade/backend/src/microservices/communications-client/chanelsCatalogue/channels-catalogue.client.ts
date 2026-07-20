// src/controllers/communications/channels/channels-catalogue.client.ts
import { Injectable } from '@nestjs/common';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

type CreateChannelDto = {
  channelKey: string; // "email" | "sms" | "storage" ...
  displayName: string;
  description?: string;
  isActive?: boolean;
};

type UpdateChannelDto = Partial<Omit<CreateChannelDto, 'channelKey'>>;

@Injectable()
export class ChannelsCatalogueCommunicationsClient extends CommunicationsHttpClient {
  // 3001 controller: @Controller('channels')
  private readonly base = '/channels';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 10_000,
    });
  }

  async list(
    params?: { active?: boolean },
    authHeader?: string,
  ): Promise<HttpResult<any[]>> {
    const query =
      typeof params?.active === 'boolean'
        ? { active: params.active }
        : undefined;

    const res = await this.http.get(this.base, {
      params: query,
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any[]>(res);
  }

  async getByKey(
    channelKey: string,
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.get(`${this.base}/by-key`, {
      params: { channelKey },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async create(
    dto: CreateChannelDto,
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.post(this.base, dto, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async updateByKey(
    channelKey: string,
    dto: UpdateChannelDto,
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.put(this.base, dto, {
      params: { channelKey },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async removeByKey(
    channelKey: string,
    authHeader?: string,
  ): Promise<HttpResult<{ deleted: boolean }>> {
    const res = await this.http.delete(this.base, {
      params: { channelKey },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<{ deleted: boolean }>(res);
  }
}
