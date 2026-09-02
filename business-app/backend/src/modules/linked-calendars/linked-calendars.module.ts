import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';

import {
  LinkedCalendar,
  LinkedCalendarSchema,
} from './schemas/linked-calendar.schema';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';
import { LinkedCalendarsService } from './linked-calendars.service';
import { LinkedCalendarsController } from './linked-calendars.controller';
import { RelayCalendarClient } from './clients/relay-calendar.client';
import { RelayModule } from '../../integrations/relay/relay.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: LinkedCalendar.name, schema: LinkedCalendarSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
    RelayModule,
    UsersModule,
  ],
  controllers: [LinkedCalendarsController],
  providers: [LinkedCalendarsService, RelayCalendarClient],
  exports: [LinkedCalendarsService, RelayCalendarClient],
})
export class LinkedCalendarsModule {}
