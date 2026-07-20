import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  NotificationExecutionLog,
  NotificationExecutionLogSchema,
} from './schemas/execution-log.schema';
import { ExecutionLogService } from './execution-log.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: NotificationExecutionLog.name,
        schema: NotificationExecutionLogSchema,
      },
    ]),
  ],
  providers: [ExecutionLogService],
  exports: [ExecutionLogService],
})
export class ExecutionLogModule {}
