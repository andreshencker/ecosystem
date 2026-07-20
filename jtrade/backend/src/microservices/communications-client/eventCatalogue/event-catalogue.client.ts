import { Injectable } from '@nestjs/common';
import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

@Injectable()
export class EventCatalogueCommunicationsClient extends CommunicationsHttpClient {
  private readonly base = '/event-catalogue';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 10_000,
    });
  }

  // ==========================
  // LIST
  // ==========================
  async list(
    params: {
      domainCatalogueId: string;
      active?: boolean;
      populateDomainCatalogue?: boolean;
    },
    authHeader?: string,
  ): Promise<HttpResult<any[]>> {
    const res = await this.http.get(this.base, {
      params: {
        domainCatalogueId: params.domainCatalogueId,
        ...(typeof params.active === 'boolean'
          ? { active: params.active }
          : {}),
        ...(typeof params.populateDomainCatalogue === 'boolean'
          ? { populateDomainCatalogue: params.populateDomainCatalogue }
          : {}),
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any[]>(res);
  }

  // ==========================
  // GET BY ID
  // ==========================
  async getById(id: string, authHeader?: string): Promise<HttpResult<any>> {
    const res = await this.http.get(`${this.base}/${id}`, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  // ==========================
  // CREATE
  // ==========================
  async create(dto: any, authHeader?: string): Promise<HttpResult<any>> {
    const res = await this.http.post(this.base, dto, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<any>(res);
  }

  // ==========================
  // UPDATE
  // ==========================
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

  // ==========================
  // DELETE
  // ==========================
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
