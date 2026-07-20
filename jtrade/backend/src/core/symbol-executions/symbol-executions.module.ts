import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SymbolExecutionsController } from './symbol-executions.controller';
import { SymbolExecutionsService } from './symbol-executions.service';

import {
  SymbolExecution,
  SymbolExecutionSchema,
} from './schemas/symbol-execution.schema';

import {
  UserAccountInfo,
  UserAccountInfoSchema,
} from '../user-account-info/schemas/user-account-info.schema';

import {
  UserProjectPlatform,
  UserProjectPlatformSchema,
} from '../user-project-platform/schemas/user-project-platform.schema';

import { Alert, AlertSchema } from '../alerts/schemas/alert.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SymbolExecution.name, schema: SymbolExecutionSchema },
      { name: UserAccountInfo.name, schema: UserAccountInfoSchema },
      { name: UserProjectPlatform.name, schema: UserProjectPlatformSchema },
      { name: Alert.name, schema: AlertSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SymbolExecutionsController],
  providers: [SymbolExecutionsService],
  exports: [SymbolExecutionsService],
})
export class SymbolExecutionsModule {}
