import { Injectable } from '@nestjs/common';
import axios from 'axios';

type PlatformResultPayload = {
  signalId: string;

  platformOk: boolean;
  platformStatus?: number;
  platformMessage?: string;
  platformData?: any;

  state: 'SENT' | 'FAILED';
};

type GetSignalInformationPayload = {
  symbol: string;
  accountNumber: string;
  timeFrame: string;
  latestSignalId: string;
  eaVersion: string;
  eaVersionId: string;
};

@Injectable()
export class CoreClient {
  private readonly baseURL: string | undefined = process.env.CORE_BASE_URL;
  private readonly apiKey: string | undefined = process.env.CORE_API_KEY;

  async updateSignalPlatformResult(
    payload: PlatformResultPayload,
  ): Promise<void> {
    if (!this.baseURL) return;

    try {
      await axios.post(
        `${this.baseURL}/signals/internal/platform-result`,
        payload,
        {
          headers: {
            ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
            'Content-Type': 'application/json',
          },
          timeout: 3000,
          validateStatus: () => true,
        },
      );
    } catch {
      // best-effort: NO rompemos el micro por trazabilidad
    }
  }

  async getSignalInformation(
    payload: GetSignalInformationPayload,
  ): Promise<string> {
    if (!this.baseURL) return 'Missing base URL';

    try {
      if (!payload) {
        console.warn(
          '[CoreClient] Empty payload passed to getSignalInformation',
        );
      }

      console.log('[CoreClient] Sending payload:', JSON.stringify(payload));

      const response = await axios.post(
        `${this.baseURL}/backend/signals/mt5/getSignalInformation`,
        payload,
        {
          headers: {
            ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
            'Content-Type': 'application/json',
          },
          timeout: 3000,
          validateStatus: () => true,
        },
      );

      if (!response || response.status >= 400) {
        return `Error: Received status ${response?.status}`;
      }

      const body = response.data;

      // 🔥 Si viene como string literal
      if (typeof body === 'string') {
        return body;
      }

      // 🔥 Si viene como objeto tipo {status, data}
      if (typeof body === 'object' && body !== null) {
        if ('data' in body) {
          return String(body.data ?? '');
        }
      }

      return 'No data';
    } catch (err) {
      console.error('[CoreClient] Error in getSignalInformation:', err);
      return 'Error contacting Signal API';
    }
  }
}
