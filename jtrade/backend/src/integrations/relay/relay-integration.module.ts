import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RelayPlatformsController } from './relay-platforms.controller';
import { RelayPlatformsService } from './relay-platforms.service';

@Module({
  imports: [HttpModule],
  controllers: [RelayPlatformsController],
  providers: [RelayPlatformsService],
  exports: [HttpModule, RelayPlatformsService],
})
export class RelayIntegrationModule {}
