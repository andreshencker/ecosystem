// src/notifications/notification.module.ts
import { Module } from '@nestjs/common';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

import { EventCatalogueModule } from './events/event-catalogue/event-catalog.module';
import { ChannelsRuntimeModule } from '../channels/runtime/channels-runtime.module';
import { ChannelsImplementationModule } from '../channels/implementation/implementation.module';
import { ExecutionLogModule } from './execution-log/execution-log.module';
import { NotificationRenderModule } from './render/notification-render.module';
import { RelayTenantContextModule } from '../../infrastructure/security/relay-tenant-context.module';

@Module({
  imports: [
    EventCatalogueModule,
    ChannelsRuntimeModule,
    ChannelsImplementationModule,
    ExecutionLogModule,
    NotificationRenderModule,
    RelayTenantContextModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
