import { Controller, Get } from '@nestjs/common';
import { Public } from '../../infrastructure/security/decorators/public.decorator';
import { GrapiflyAppConfigService } from './grapifly-app-config.service';

@Controller('app-config')
export class GrapiflyAppConfigController {
  constructor(private readonly appConfig: GrapiflyAppConfigService) {}

  @Public()
  @Get()
  getConfig() {
    return this.appConfig.getConfig();
  }
}
