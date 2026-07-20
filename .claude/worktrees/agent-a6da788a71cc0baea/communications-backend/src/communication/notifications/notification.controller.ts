// src/notifications/notification.controller.ts
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { NotificationService } from './notification.service';
import { NotifyEventDto } from './dto/notify-event.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: NotificationService,
  ) {}

  /**
   * POST /notifications/event
   * Returns 200 when all channels succeed, 207 when any channel fails.
   * Per DEC-001 Option A. Response body shape is unchanged in both cases.
   */
  @Post('event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a notification event' })
  @ApiResponse({
    status: 200,
    description: 'All channels delivered successfully — every results[].success is true',
  })
  @ApiResponse({
    status: 207,
    description: 'One or more channels failed — inspect results[].success per channel',
  })
  async notifyEvent(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: NotifyEventDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.assertApiKey(apiKey);
    const result = await this.service.notifyEvent(dto);
    const allSucceeded = result.results.every((r) => r.success);
    if (!allSucceeded) {
      res.status(HttpStatus.MULTI_STATUS);
    }
    return result;
  }

  private assertApiKey(apiKey?: string) {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
