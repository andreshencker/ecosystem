import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { RuntimeQueryDto, RuntimeResultDto } from './dto/signalbot.dto';
import { SignalbotsService } from './signalbots.service';

/**
 * Public runtime endpoint the EA / bot polls. No JWT — the `token` (per signalbot)
 * is the credential. This is what the old orchestrator proxied; now it's native.
 */
@Controller('runtime')
export class RuntimeController {
  constructor(private readonly service: SignalbotsService) {}

  @Get('status')
  status() {
    return { status: 'ok' };
  }

  @Get(':productKey')
  @HttpCode(200)
  getSignal(@Param('productKey') productKey: string, @Query() q: RuntimeQueryDto) {
    return this.service.getSignal(productKey, q);
  }

  @Post('result')
  @HttpCode(200)
  result(@Body() dto: RuntimeResultDto) {
    return this.service.reportResult(dto);
  }
}
