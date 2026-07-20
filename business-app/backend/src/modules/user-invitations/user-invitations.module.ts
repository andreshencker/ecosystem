import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import { Business, BusinessSchema } from '../business/schemas/business.schema';
import { UserInvitationsService } from './user-invitations.service';
import { UserInvitationsController } from './user-invitations.controller';
import { UsersModule } from '../users/users.module';
import { CommunicationsModule } from '../../integrations/communications/communications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
    UsersModule,
    CommunicationsModule,
  ],
  controllers: [UserInvitationsController],
  providers: [UserInvitationsService],
  exports: [UserInvitationsService],
})
export class UserInvitationsModule {}
