// src/microservices/communications-client/notifications/notifications-client.ts
import { Injectable } from '@nestjs/common';

import {
  CommunicationsHttpClient,
  type HttpResult,
} from '../communications-http.client';

import type { NotifyEventDto } from './dto/notify-event.dto';
import type { NotificationResultDto } from './dto/notification-result.dto';

type NotifyEventResponse = {
  eventKey: string;
  companyId: string;
  results: NotificationResultDto[];
};

@Injectable()
export class NotificationsClient extends CommunicationsHttpClient {
  // 3001 controller: @Controller('notifications')
  private readonly base = '/notifications';

  constructor() {
    super({
      baseURL: process.env.COMMUNICATION_BASE_URL ?? 'http://54.166.195.143:3001',
      timeoutMs: 10_000,
    });
  }

  /**
   * 3001 => POST /notifications/event
   * Response:
   * { eventKey, companyId, results: NotificationResultDto[] }
   *
   * Retornamos SOLO results para mantener tu firma.
   * ✅ IMPORTANT: si falla, lanzamos error para que el caller lo loguee.
   */
  async notifyEvent(
    dto: NotifyEventDto,
    authHeader?: string,
  ): Promise<HttpResult<NotificationResultDto[]>> {
    const res = await this.http.post(`${this.base}/event`, dto, {
      headers: this.buildHeaders(authHeader),
      validateStatus: () => true,
    });

    const normalized = this.normalize<NotifyEventResponse>(res);

    if (!normalized.ok) {
      // ✅ Lanzamos error para no “silenciar” fallos
      const msg = `[COMMUNICATIONS] notifyEvent failed: status=${normalized.status} message=${normalized.message}`;
      const err = new Error(msg);
      (err as any).status = normalized.status;
      (err as any).raw = normalized;
      throw err;
    }

    return {
      ok: true,
      status: normalized.status,
      data: normalized.data?.results ?? [],
    } as HttpResult<NotificationResultDto[]>;
  }

  async notify(
    dto: NotifyEventDto,
    authHeader?: string,
  ): Promise<HttpResult<NotificationResultDto[]>> {
    return this.notifyEvent(dto, authHeader);
  }
}
