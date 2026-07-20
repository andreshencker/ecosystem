import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Contract, ContractSchema } from './schemas/contract.schema';
import { Customer, CustomerSchema } from '../customer/schemas/customer.schema';
import { Shift, ShiftSchema } from '../shifts/schemas/shift.schema';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { CommunicationsModule } from '../../integrations/communications/communications.module';
import { UsersModule } from '../users/users.module';
import { LinkedCalendar, LinkedCalendarSchema } from '../linked-calendars/schemas/linked-calendar.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: LinkedCalendar.name, schema: LinkedCalendarSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
    CommunicationsModule,
    UsersModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
