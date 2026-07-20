// src/controllers/communications/company-themes-client.ts
import { Injectable } from '@nestjs/common';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

type CreateCompanyThemeDto = {
  companyId: string;
  themeKey: string;
  displayName: string;
  // ... lo que tengas en tu DTO real
  isActive?: boolean;
};

type UpdateCompanyThemeDto = Partial<CreateCompanyThemeDto>;

@Injectable()
export class CompanyThemesCommunicationsClient extends CommunicationsHttpClient {
  // 3001 controller: @Controller('company-themes')
  private readonly base = '/company-themes';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 10_000,
    });
  }

  async list(
    params?: { companyId?: string; active?: boolean },
    authHeader?: string,
  ): Promise<HttpResult<any[]>> {
    const query: any = {};
    if (params?.companyId) query.companyId = params.companyId;
    if (typeof params?.active === 'boolean') query.active = params.active;

    const res = await this.http.get(this.base, {
      params: Object.keys(query).length ? query : undefined,
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

  async create(
    dto: CreateCompanyThemeDto,
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.post(this.base, dto, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async updateById(
    id: string,
    dto: UpdateCompanyThemeDto,
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.put(`${this.base}/${id}`, dto, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async removeById(
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
