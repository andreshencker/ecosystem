import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import {
  Company,
  CompanySchema,
} from '../communication/company/company-info/schemas/company.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersBootstrapService } from './users-bootstrap.service';
import { NotificationModule } from '../communication/notifications/notification.module';
import { CompanyProvisioningModule } from '../communication/company/provisioning/company-provisioning.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    NotificationModule,
    CompanyProvisioningModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersBootstrapService],
  exports: [UsersService],
})
export class UsersModule {}
