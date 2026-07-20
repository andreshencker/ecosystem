import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';

/** Global event bus — available everywhere without explicit import. */
@Global()
@Module({
  providers: [EventBusService],
  exports:   [EventBusService],
})
export class EventBusModule {}
