// src/notifications/notification.controller.ts
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotificationService } from './notification.service';
import { NotifyEventDto } from './dto/notify-event.dto';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: NotificationService,
  ) {}

  /**
   * POST /notifications/event
   * Headers: x-api-key
   * Body: { companyId, event, email?, phone?, variables?, payload? }
   */
  @Post('event')
  @HttpCode(200)
  async notifyEvent(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: NotifyEventDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.notifyEvent(dto);
  }

  private assertApiKey(apiKey?: string) {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
