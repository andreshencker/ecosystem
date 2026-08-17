import { Module } from '@nestjs/common';

import { MediaController } from './media.controller';
import { MediaService } from './services/media.service';
import { MediaKeyService } from './services/media-key.service';
import { MediaValidatorService } from './services/media-validator.service';

import { ChannelsRuntimeModule } from '../../communication/channels/runtime/channels-runtime.module';
import { ChannelsImplementationModule } from '../../communication/channels/implementation/implementation.module';
import { RelayTenantContextModule } from '../../infrastructure/security/relay-tenant-context.module';

@Module({
  imports: [
    ChannelsRuntimeModule,
    ChannelsImplementationModule,
    RelayTenantContextModule,
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaKeyService, MediaValidatorService],
  exports: [MediaService],
})
export class MediaModule {}
