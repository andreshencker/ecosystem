import { Injectable } from '@nestjs/common';
import { OrchestratorHttpClient } from '../orchestrator-http.client';

@Injectable()
export class SignalClientService extends OrchestratorHttpClient {
  constructor() {
    super({
      baseURL: process.env.ORCHESTRATOR_BASE_URL ?? 'http://orchestrator:3003',
      timeoutMs: 10_000,
    });
  }

  async sendSignal(platformName: string, payload: any) {
    const apiKey = process.env.ORCHESTRATOR_API_KEY;
    console.log(`Sending for ${platformName} to ${apiKey}`);
    console.log(payload);
    const res = await this.http.post(
      `orchestrator/signals/${platformName}`,
      payload,
      {
        headers: this.buildHeaders(),
        validateStatus: () => true,
      },
    );
    const data: any = res.data;

    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      message: data?.message ?? data?.error ?? null,
      data: data ?? null,
    };
  }
}
