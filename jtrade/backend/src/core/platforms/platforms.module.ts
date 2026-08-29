import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PlatformsController } from './platforms.controller';
import { PlatformsService } from './platforms.service';
import { RelayIntegrationModule } from '../../integrations/relay/relay-integration.module';

import { Platform, PlatformSchema } from './schemas/platform.schema';

@Module({
  imports: [
    RelayIntegrationModule,
    MongooseModule.forFeature([
      { name: Platform.name, schema: PlatformSchema },
    ]),
  ],
  controllers: [PlatformsController],
  providers: [PlatformsService],
  exports: [PlatformsService],
})
export class PlatformsModule {}
