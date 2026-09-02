import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GrapiflyAppConfigController } from './grapifly-app-config.controller';
import { GrapiflyAppConfigService } from './grapifly-app-config.service';

@Module({
  imports: [HttpModule],
  controllers: [GrapiflyAppConfigController],
  providers: [GrapiflyAppConfigService],
  exports: [GrapiflyAppConfigService],
})
export class GrapiflyIntegrationModule {}
