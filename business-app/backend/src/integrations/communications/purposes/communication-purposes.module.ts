import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { CommunicationsModule } from '../communications.module';
import { CommunicationPurposesService } from './communication-purposes.service';
import { CommunicationPurposesController } from './communication-purposes.controller';

/**
 * CommunicationPurposesModule — exposes REST endpoints that proxy
 * Communications App's domain-catalogue and provider-credentials APIs.
 *
 * No local MongoDB schema. All data persists exclusively in Communications.
 */
@Module({
  imports: [
    HttpModule,
    CommunicationsModule,
  ],
  controllers: [CommunicationPurposesController],
  providers: [CommunicationPurposesService],
})
export class CommunicationPurposesModule {}
