import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../applications/applications.module';
import { UsersModule } from '../users/users.module';
import { ApplicationAssignmentsService } from './application-assignments.service';
import { ApplicationAssignment, ApplicationAssignmentSchema } from './schemas/application-assignment.schema';

@Module({
  imports: [UsersModule, ApplicationsModule, MongooseModule.forFeature([{ name: ApplicationAssignment.name, schema: ApplicationAssignmentSchema }])],
  providers: [ApplicationAssignmentsService],
  exports: [ApplicationAssignmentsService],
})
export class ApplicationAssignmentsModule {}
