// src/microservices/communications-client/communications-http.client.ts
import { BaseHttpClient } from '../../common/http/base-http.client';

export type { HttpResult } from '../../common/http/base-http.client';

export abstract class CommunicationsHttpClient extends BaseHttpClient {
  protected buildHeaders(auth?: string) {
    const apiKey = process.env.COMMUNICATION_API_KEY;

    const isBearer =
      typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ');
    const authHeader =
      typeof auth === 'string' && auth.trim().length > 0
        ? isBearer
          ? auth.trim()
          : `Bearer ${auth.trim()}`
        : undefined;

    return {
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      ...(authHeader ? { Authorization: authHeader } : {}),
      'Content-Type': 'application/json',
    };
  }
}
