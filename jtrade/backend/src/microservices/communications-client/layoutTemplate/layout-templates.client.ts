// src/microservices/communications-client/layout-templates/layout-templates.client.ts
import { Injectable } from '@nestjs/common';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

// ✅ En 3002 NO importes schemas de 3001.
// Tip local para evitar errores de path.
export type TemplateType = 'email' | 'pdf';

@Injectable()
export class LayoutTemplatesCommunicationsClient extends CommunicationsHttpClient {
  // 3001 controller: @Controller('layout-templates')
  private readonly base = '/layout-templates';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 15_000,
    });
  }

  async listByCompany(
    params: {
      companyId: string;
      templateType?: TemplateType;
      active?: boolean;
      includeHtml?: boolean;
      populateTheme?: boolean;
      populateCompany?: boolean;
    },
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.get(`${this.base}/by-company`, {
      params: {
        companyId: params.companyId,
        ...(params.templateType ? { templateType: params.templateType } : {}),
        ...(typeof params.active === 'boolean'
          ? { active: params.active }
          : {}),
        ...(typeof params.includeHtml === 'boolean'
          ? { includeHtml: params.includeHtml }
          : {}),
        ...(typeof params.populateTheme === 'boolean'
          ? { populateTheme: params.populateTheme }
          : {}),
        ...(typeof params.populateCompany === 'boolean'
          ? { populateCompany: params.populateCompany }
          : {}),
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async getDefaultByCompany(
    params: {
      companyId: string;
      templateType: TemplateType;
      populateTheme?: boolean;
      populateCompany?: boolean;
    },
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.get(`${this.base}/default-by-company`, {
      params: {
        companyId: params.companyId,
        templateType: params.templateType,
        ...(typeof params.populateTheme === 'boolean'
          ? { populateTheme: params.populateTheme }
          : {}),
        ...(typeof params.populateCompany === 'boolean'
          ? { populateCompany: params.populateCompany }
          : {}),
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  async companyOverview(
    params: { companyId: string; includeHtml?: boolean },
    authHeader?: string,
  ): Promise<HttpResult<any>> {
    const res = await this.http.get(`${this.base}/company-overview`, {
      params: {
        companyId: params.companyId,
        ...(typeof params.includeHtml === 'boolean'
          ? { includeHtml: params.includeHtml }
          : {}),
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
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

  async remove(id: string, authHeader?: string): Promise<HttpResult<any>> {
    const res = await this.http.delete(`${this.base}/${id}`, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }
}
