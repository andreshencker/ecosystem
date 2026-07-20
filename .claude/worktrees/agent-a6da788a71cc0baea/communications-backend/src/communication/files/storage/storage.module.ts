import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/modules-express';

import { StorageController } from './storage.controller';

import { StorageService } from './services/storage.service';
import { StorageKeyService } from './services/storage-key.service';
import { StorageValidatorService } from './services/storage-validator.service';

// 🔌 módulos que ya usas en media
import { ChannelsRuntimeModule } from '../../channels/runtime/channels-runtime.module';
import { ChannelsImplementationModule } from '../../channels/implementation/implementation.module';

@Module({
  imports: [
    MulterModule.register({}), // memoria (buffer)
    ChannelsRuntimeModule,
    ChannelsImplementationModule,
  ],
  controllers: [StorageController],
  providers: [StorageService, StorageKeyService, StorageValidatorService],
  exports: [
    StorageService, // 🔥 clave para reutilizar en otros módulos (robots, media, etc.)
  ],
})
export class StorageModule {}
