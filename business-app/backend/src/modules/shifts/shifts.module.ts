import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Shift, ShiftSchema } from './schemas/shift.schema';
import { SyncHistory, SyncHistorySchema } from './sync/schemas/sync-history.schema';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { ShiftSyncService } from './sync/services/shift-sync.service';
import { CommunicationsModule } from '../../integrations/communications/communications.module';
import { UsersModule } from '../users/users.module';
import { LinkedCalendarsModule } from '../linked-calendars/linked-calendars.module';
import { BusinessIntelligenceModule } from '../../integrations/business-intelligence/business-intelligence.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shift.name,        schema: ShiftSchema        },
      { name: Contract.name,     schema: ContractSchema     },
      { name: SyncHistory.name,  schema: SyncHistorySchema  },
    ]),
    CommunicationsModule,
    UsersModule,
    LinkedCalendarsModule,
    BusinessIntelligenceModule,
  ],
  controllers: [ShiftsController],
  providers:   [ShiftsService, ShiftSyncService],
  exports:     [ShiftsService],
})
export class ShiftsModule {}
