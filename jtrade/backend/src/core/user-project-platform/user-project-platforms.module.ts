import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  UserProjectPlatform,
  UserProjectPlatformSchema,
} from './schemas/user-project-platform.schema';

import {
  ProjectCodePlatform,
  ProjectCodePlatformSchema,
} from '../project-code-platform/schemas/project-code-platform.schema';

import { User, UserSchema } from '../users/schemas/user.schema';

import { UserProjectPlatformsController } from './user-project-platforms.controller';
import { UserProjectPlatformsService } from './user-project-platforms.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: UserProjectPlatform.name,
        schema: UserProjectPlatformSchema,
      },
      {
        name: ProjectCodePlatform.name,
        schema: ProjectCodePlatformSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [UserProjectPlatformsController],
  providers: [UserProjectPlatformsService],
  exports: [UserProjectPlatformsService],
})
export class UserProjectPlatformsModule {}
