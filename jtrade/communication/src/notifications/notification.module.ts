// src/notifications/notification.module.ts
import { Module } from '@nestjs/common';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

import { EventCatalogueModule } from './events/event-catalogue/event-catalog.module';
import { ChannelsRuntimeModule } from '../channels/runtime/channels-runtime.module';
import { ChannelsImplementationModule } from '../channels/implementation/implementation.module';

// ✅ nuevos
import { SourceOfTruthModule } from '../common/source-of-truth/source-of-truth.module';
import { TemplateEngineModule } from '../common/template-engine/template-engine.module';

@Module({
  imports: [
    EventCatalogueModule,
    ChannelsRuntimeModule,
    ChannelsImplementationModule,

    // ✅ para SOT + composer
    SourceOfTruthModule,
    TemplateEngineModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
