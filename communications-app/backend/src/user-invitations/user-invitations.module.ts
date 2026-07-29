import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import {
  Company,
  CompanySchema,
} from '../communication/company/company-info/schemas/company.schema';
import { UserInvitationsService } from './user-invitations.service';
import { UserInvitationsController } from './user-invitations.controller';
import { UsersModule } from '../users/users.module';
import { NotificationModule } from '../communication/notifications/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    UsersModule,
    NotificationModule,
  ],
  controllers: [UserInvitationsController],
  providers: [UserInvitationsService],
  exports: [UserInvitationsService],
})
export class UserInvitationsModule {}
