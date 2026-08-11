import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../applications/applications.module';
import { ApplicationAssignmentsModule } from '../access/application-assignments.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdmin, PlatformAdminSchema } from './schemas/platform-admin.schema';

@Module({
  imports: [AuthModule, UsersModule, ApplicationsModule, ApplicationAssignmentsModule, MongooseModule.forFeature([{ name: PlatformAdmin.name, schema: PlatformAdminSchema }])],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PlatformAdminGuard],
})
export class PlatformAdminModule {}
