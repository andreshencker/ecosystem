import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { EmployeeGuard } from './employee.guard';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeProfile, EmployeeProfileSchema } from './schemas/employee-profile.schema';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    MongooseModule.forFeature([{ name: EmployeeProfile.name, schema: EmployeeProfileSchema }]),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeeGuard],
  exports: [EmployeesService],
})
export class EmployeesModule {}
