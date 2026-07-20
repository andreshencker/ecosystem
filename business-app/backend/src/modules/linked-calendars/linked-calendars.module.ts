import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';

import { LinkedCalendar, LinkedCalendarSchema } from './schemas/linked-calendar.schema';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';
import { LinkedCalendarsService } from './linked-calendars.service';
import { LinkedCalendarsController } from './linked-calendars.controller';
import { CommunicationsCalendarClient } from './clients/communications-calendar.client';
import { CommunicationsModule } from '../../integrations/communications/communications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: LinkedCalendar.name, schema: LinkedCalendarSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
    CommunicationsModule,
    UsersModule,
  ],
  controllers: [LinkedCalendarsController],
  providers: [LinkedCalendarsService, CommunicationsCalendarClient],
  exports:   [LinkedCalendarsService, CommunicationsCalendarClient],
})
export class LinkedCalendarsModule {}
