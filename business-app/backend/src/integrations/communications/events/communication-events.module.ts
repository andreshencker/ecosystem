import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { CommunicationsModule } from '../communications.module';
import { CommunicationEventsService } from './communication-events.service';
import { CommunicationEventsController } from './communication-events.controller';

/**
 * CommunicationEventsModule — exposes proxy endpoints that forward
 * Business App requests to Communications /event-catalogue endpoints.
 *
 * No local MongoDB schema. All event data persists exclusively in Communications.
 */
@Module({
  imports: [
    HttpModule,
    CommunicationsModule,
  ],
  controllers: [CommunicationEventsController],
  providers: [CommunicationEventsService],
})
export class CommunicationEventsModule {}
