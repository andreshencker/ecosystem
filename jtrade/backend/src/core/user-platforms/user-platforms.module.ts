import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserPlatformsController } from './user-platforms.controller';
import { UserPlatformsService } from './user-platforms.service';

import {
  UserPlatform,
  UserPlatformSchema,
} from './schemas/user-platform.schema';

// ✅ IMPORTA PLATFORM SCHEMA
import { Platform, PlatformSchema } from '../platforms/schemas/platform.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPlatform.name, schema: UserPlatformSchema },
      { name: Platform.name, schema: PlatformSchema },
    ]),
  ],
  controllers: [UserPlatformsController],
  providers: [UserPlatformsService],
  exports: [UserPlatformsService],
})
export class UserPlatformsModule {}
