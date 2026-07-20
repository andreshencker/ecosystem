// src/microservices/communications-client/companies/companies-client.ts
import { Injectable } from '@nestjs/common';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

export type CompanyDto = {
  id: string;
  companyKey: string;
  displayName: string;
  legalName?: string;
  tagline?: string;
  timezone?: string;
  isActive?: boolean;

  // branding
  logoIconUrl?: string;
  logoFullUrl?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type UpdateCompanyDto = Partial<{
  companyKey: string;
  displayName: string;
  legalName: string;
  tagline: string;
  timezone: string;
  isActive: boolean;

  logoIconUrl: string;
  logoFullUrl: string;

  // TODO: si luego agregas “upload desde front”, eso NO va aquí,
  // eso se hace en el backend gateway/controller con multipart,
  // y aquí solo consumes el endpoint ya resuelto.
}>;

@Injectable()
export class CompaniesCommunicationsClient extends CommunicationsHttpClient {
  // 3001 controller: @Controller('companies')
  private readonly base = '/companies';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 15_000,
    });
  }

  async list(
    params?: { active?: boolean },
    authHeader?: string,
  ): Promise<HttpResult<CompanyDto[]>> {
    const res = await this.http.get(this.base, {
      params:
        typeof params?.active === 'boolean'
          ? { active: params.active }
          : undefined,
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<CompanyDto[]>(res);
  }

  async getById(
    companyId: string,
    authHeader?: string,
  ): Promise<HttpResult<CompanyDto>> {
    const res = await this.http.get(`${this.base}/${companyId}`, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<CompanyDto>(res);
  }

  async getByKey(
    companyKey: string,
    authHeader?: string,
  ): Promise<HttpResult<CompanyDto>> {
    const res = await this.http.get(
      `${this.base}/by-key/${encodeURIComponent(companyKey)}`,
      {
        headers: this.buildHeaders(authHeader),
        validateStatus: () => true,
      },
    );

    return this.normalize<CompanyDto>(res);
  }

  async updateByKey(
    companyKey: string,
    dto: UpdateCompanyDto,
    authHeader?: string,
  ): Promise<HttpResult<CompanyDto>> {
    const res = await this.http.patch(
      `${this.base}/${encodeURIComponent(companyKey)}`,
      dto,
      {
        headers: this.buildHeaders(authHeader),
        validateStatus: () => true,
      },
    );

    return this.normalize<CompanyDto>(res);
  }

  async removeByKey(
    companyKey: string,
    authHeader?: string,
  ): Promise<HttpResult<{ deleted: boolean }>> {
    const res = await this.http.delete(
      `${this.base}/${encodeURIComponent(companyKey)}`,
      {
        headers: this.buildHeaders(authHeader),
        validateStatus: () => true,
      },
    );

    return this.normalize<{ deleted: boolean }>(res);
  }
}
