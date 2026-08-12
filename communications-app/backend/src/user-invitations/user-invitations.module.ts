import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import {
  Company,
  CompanySchema,
} from '../communication/company/company-info/schemas/company.schema';
import { UserInvitationsService } from './user-invitations.service';
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
  // Legacy invitation persistence remains temporarily available to the old
  // platform-company provisioning path, but Relay no longer exposes HTTP
  // invitation endpoints. Organization invitations are owned by Grapifly.
  controllers: [],
  providers: [UserInvitationsService],
  exports: [UserInvitationsService],
})
export class UserInvitationsModule {}
