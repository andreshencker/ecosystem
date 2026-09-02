import { Controller, Get } from '@nestjs/common';
import { GrapiflyAppConfigService } from './grapifly-app-config.service';

@Controller('app-config')
export class GrapiflyAppConfigController {
  constructor(private readonly appConfig: GrapiflyAppConfigService) {}

  @Get()
  getConfig() {
    return this.appConfig.getConfig();
  }
}
