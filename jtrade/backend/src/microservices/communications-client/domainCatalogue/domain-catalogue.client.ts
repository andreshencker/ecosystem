import { Injectable } from '@nestjs/common';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

export type DomainChannel = 'email' | 'sms';

export type DomainCatalogueDto = {
  id: string;
  companyId: string;
  domainKey: string;
  displayName: string;
  domainCategory: string;
  isActive: boolean;
  channelsToUse: {
    channel: DomainChannel;
    providerCredentialsId: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
};

export type DomainCredentialsDto = {
  domain: {
    id: string;
    companyId: string;
    domainKey: string;
    displayName: string;
    isActive: boolean;
  };
  channels: Array<{
    channel: DomainChannel;
    providerCredentialsId: string;
    tag?: string | null;
    credentialsIsActive?: boolean | null;
    companyChannelProviderId?: string | null;
    companyId?: string | null;
    providerKey?: string | null;
    providerDisplayName?: string | null;
    connectionType?: string | null;
    channelKey?: string | null;
    channelDisplayName?: string | null;
  }>;
};

@Injectable()
export class DomainCatalogueCommunicationsClient extends CommunicationsHttpClient {
  private readonly base = '/domain-catalogue';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 10_000,
    });
  }

  async list(
    params: { companyId: string; active?: boolean },
    authHeader?: string,
  ): Promise<HttpResult<DomainCatalogueDto[]>> {
    const res = await this.http.get(this.base, {
      params: {
        companyId: params.companyId,
        ...(typeof params.active === 'boolean'
          ? { active: params.active }
          : {}),
      },
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<DomainCatalogueDto[]>(res);
  }

  async getById(
    id: string,
    authHeader?: string,
  ): Promise<HttpResult<DomainCatalogueDto>> {
    const res = await this.http.get(`${this.base}/${encodeURIComponent(id)}`, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<DomainCatalogueDto>(res);
  }

  async create(
    dto: any,
    authHeader?: string,
  ): Promise<HttpResult<DomainCatalogueDto>> {
    const res = await this.http.post(this.base, dto, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    return this.normalize<DomainCatalogueDto>(res);
  }

  async update(
    id: string,
    dto: any,
    authHeader?: string,
  ): Promise<HttpResult<DomainCatalogueDto>> {
    const res = await this.http.patch(
      `${this.base}/${encodeURIComponent(id)}`,
      dto,
      {
        headers: this.buildHeaders(authHeader),
        validateStatus: () => true,
      },
    );

    return this.normalize<DomainCatalogueDto>(res);
  }

  async remove(
    id: string,
    authHeader?: string,
  ): Promise<HttpResult<{ deleted: boolean }>> {
    const res = await this.http.delete(
      `${this.base}/${encodeURIComponent(id)}`,
      {
        headers: this.buildHeaders(authHeader),
        validateStatus: () => true,
      },
    );

    return this.normalize<{ deleted: boolean }>(res);
  }

  async getCredentials(
    domainId: string,
    authHeader?: string,
  ): Promise<HttpResult<DomainCredentialsDto>> {
    const res = await this.http.get(
      `${this.base}/${encodeURIComponent(domainId)}/credentials`,
      {
        headers: this.buildHeaders(authHeader),
        validateStatus: () => true,
      },
    );

    return this.normalize<DomainCredentialsDto>(res);
  }

  async updateCredential(params: {
    domainId: string;
    channel: DomainChannel;
    providerCredentialsId: string;
    authHeader?: string;
  }): Promise<HttpResult<DomainCredentialsDto>> {
    const res = await this.http.patch(
      `${this.base}/${encodeURIComponent(params.domainId)}/credentials/${
        params.channel
      }`,
      {
        providerCredentialsId: params.providerCredentialsId,
      },
      {
        headers: this.buildHeaders(params.authHeader),
        validateStatus: () => true,
      },
    );

    return this.normalize<DomainCredentialsDto>(res);
  }

  async bulkUpdateCredentials(params: {
    companyId: string;
    domainIds: string[];
    channel: DomainChannel;
    providerCredentialsId: string;
    authHeader?: string;
  }): Promise<
    HttpResult<{
      updated: boolean;
      domainIds: string[];
      channel: DomainChannel;
      providerCredentialsId: string;
    }>
  > {
    const res = await this.http.patch(
      `${this.base}/bulk/credentials`,
      {
        companyId: params.companyId,
        domainIds: params.domainIds,
        channel: params.channel,
        providerCredentialsId: params.providerCredentialsId,
      },
      {
        headers: this.buildHeaders(params.authHeader),
        validateStatus: () => true,
      },
    );

    return this.normalize<{
      updated: boolean;
      domainIds: string[];
      channel: DomainChannel;
      providerCredentialsId: string;
    }>(res);
  }
}
