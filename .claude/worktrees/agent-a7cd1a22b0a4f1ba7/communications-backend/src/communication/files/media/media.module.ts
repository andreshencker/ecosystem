import { Module } from '@nestjs/common';

import { MediaController } from './media.controller';
import { MediaService } from './services/media.service';
import { MediaKeyService } from './services/media-key.service';
import { MediaValidatorService } from './services/media-validator.service';

import { ChannelsRuntimeModule } from '../../channels/runtime/channels-runtime.module';
import { ChannelsImplementationModule } from '../../channels/implementation/implementation.module';

@Module({
  imports: [ChannelsRuntimeModule, ChannelsImplementationModule],
  controllers: [MediaController],
  providers: [MediaService, MediaKeyService, MediaValidatorService],
  exports: [MediaService],
})
export class MediaModule {}
