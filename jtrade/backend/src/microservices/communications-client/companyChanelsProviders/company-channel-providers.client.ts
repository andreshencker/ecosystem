// src/controllers/communications/company-channel-providers/company-channel-providers.client.ts
import { Injectable } from '@nestjs/common';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

type FindAllParams = {
  companyId: string;
  channelId?: string;
  active?: boolean;
  isDefault?: boolean;
  populate?: boolean;
};

type CreateCompanyChannelProviderDto = {
  companyId: string;
  channelId: string; // ObjectId (string)
  providerId: string; // ObjectId (string)
  isDefault?: boolean;
  isActive?: boolean;
};

type UpdateCompanyChannelProviderDto = Partial<{
  channelId: string;
  providerId: string;
  isDefault: boolean;
  isActive: boolean;
}>;

@Injectable()
export class CompanyChannelProvidersCommunicationsClient extends CommunicationsHttpClient {
  // 3001 controller: @Controller('company-channel-providers')
  private readonly base = '/company-channel-providers';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 10_000,
    });
  }

  async list(
    params: FindAllParams,
    authHeader?: string,
  ): Promise<HttpResult<any[]>> {
    const res = await this.http.get(this.base, {
      params: {
        companyId: params.companyId,
        ...(params.channelId ? { channelId: params.channelId } : {}),
        ...(typeof params.active === 'boolean'
          ? { active: params.active }
          : {}),
        ...(typeof params.isDefault === 'boolean'
          ? { isDefault: params.isDefault }
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

  async getDefaultByChannel(
    params: { companyId: string; channelId: string; populate?: boolean },
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.get(`${this.base}/default/by-channel`, {
      params: {
        companyId: params.companyId,
        channelId: params.channelId,
        ...(typeof params.populate === 'boolean'
          ? { populate: params.populate }
          : {}),
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async create(
    dto: CreateCompanyChannelProviderDto,
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.post(this.base, dto, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async update(
    id: string,
    dto: UpdateCompanyChannelProviderDto,
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
