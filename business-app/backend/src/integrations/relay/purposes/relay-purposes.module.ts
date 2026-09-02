import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { RelayModule } from '../relay.module';
import { RelayPurposesService } from './relay-purposes.service';
import { RelayPurposesController } from './relay-purposes.controller';

/**
 * RelayPurposesModule — exposes REST endpoints that proxy
 * Relay App's domain-catalogue and provider-credentials APIs.
 *
 * No local MongoDB schema. All data persists exclusively in Relay.
 */
@Module({
  imports: [HttpModule, RelayModule],
  controllers: [RelayPurposesController],
  providers: [RelayPurposesService],
})
export class RelayPurposesModule {}
