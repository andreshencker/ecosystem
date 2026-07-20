// src/controllers/communications/provider-credentials/provider-credentials.client.ts
import { Injectable } from '@nestjs/common';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

type CreateProviderCredentialsDto = {
  companyChannelProviderId: string;
  tag: string;
  credentials: Record<string, any>;
  isActive?: boolean;
};

type UpdateProviderCredentialsDto = Partial<{
  tag: string;
  credentials: Record<string, any>;
  isActive: boolean;
}>;

export type ProviderCredentialChannel = 'email' | 'sms';

@Injectable()
export class ProviderCredentialsCommunicationsClient extends CommunicationsHttpClient {
  private readonly base = '/provider-credentials';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 10_000,
    });
  }

  async options(
    params: {
      companyId: string;
      channel?: ProviderCredentialChannel;
      active?: boolean;
    },
    authHeader?: string,
  ): Promise<HttpResult<any[]>> {
    const res = await this.http.get(`${this.base}/options`, {
      params: {
        companyId: params.companyId,
        ...(params.channel ? { channel: params.channel } : {}),
        ...(typeof params.active === 'boolean'
          ? { active: params.active }
          : {}),
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any[]>(res);
  }

  async create(
    dto: CreateProviderCredentialsDto,
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.post(this.base, dto, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async list(
    params: {
      companyChannelProviderId: string;
      active?: boolean;
      populate?: boolean;
    },
    authHeader?: string,
  ): Promise<HttpResult<any[]>> {
    const res = await this.http.get(this.base, {
      params: {
        companyChannelProviderId: params.companyChannelProviderId,
        ...(typeof params.active === 'boolean'
          ? { active: params.active }
          : {}),
        ...(typeof params.populate === 'boolean'
          ? { populate: params.populate }
          : {}),
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any[]>(res);
  }

  async getById(
    id: string,
    params?: { populate?: boolean },
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.get(`${this.base}/${id}`, {
      params:
        typeof params?.populate === 'boolean'
          ? { populate: params.populate }
          : undefined,
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async debugDecrypted(
    params: { companyChannelProviderId: string; tag: string },
    authHeader?: string,
  ): Promise<HttpResult<Record<string, any>>> {
    const res = await this.http.get(`${this.base}/debug/decrypted`, {
      params: {
        companyChannelProviderId: params.companyChannelProviderId,
        tag: params.tag,
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<Record<string, any>>(res);
  }

  async update(
    id: string,
    dto: UpdateProviderCredentialsDto,
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
