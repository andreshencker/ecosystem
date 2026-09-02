import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { RelayModule } from '../relay.module';
import { RelayEventsService } from './relay-events.service';
import { RelayEventsController } from './relay-events.controller';

/**
 * RelayEventsModule — exposes proxy endpoints that forward
 * Business App requests to Relay /event-catalogue endpoints.
 *
 * No local MongoDB schema. All event data persists exclusively in Relay.
 */
@Module({
  imports: [HttpModule, RelayModule],
  controllers: [RelayEventsController],
  providers: [RelayEventsService],
})
export class RelayEventsModule {}
