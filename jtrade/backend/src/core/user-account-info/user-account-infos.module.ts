import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  UserAccountInfo,
  UserAccountInfoSchema,
} from './schemas/user-account-info.schema';

import { UserAccountInfoService } from './user-account-infos.service';
import { UserAccountInfoController } from './user-account-infos.controller';

import {
  UserProjectPlatform,
  UserProjectPlatformSchema,
} from '../user-project-platform/schemas/user-project-platform.schema';

import {
  IndicatorProject,
  IndicatorProjectSchema,
} from '../indicator-projects/schemas/indicator-project.schema';

import { User, UserSchema } from '../users/schemas/user.schema';

import {
  SymbolExecution,
  SymbolExecutionSchema,
} from '../symbol-executions/schemas/symbol-execution.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAccountInfo.name, schema: UserAccountInfoSchema },
      { name: UserProjectPlatform.name, schema: UserProjectPlatformSchema },
      { name: IndicatorProject.name, schema: IndicatorProjectSchema },
      { name: User.name, schema: UserSchema },
      { name: SymbolExecution.name, schema: SymbolExecutionSchema },
    ]),
  ],
  controllers: [UserAccountInfoController],
  providers: [UserAccountInfoService],
  exports: [UserAccountInfoService],
})
export class UserAccountInfoModule {}
