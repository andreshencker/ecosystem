import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import { Business, BusinessSchema } from '../business/schemas/business.schema';
import { UserInvitationsService } from './user-invitations.service';
import { UserInvitationsController } from './user-invitations.controller';
import { UsersModule } from '../users/users.module';
import { RelayModule } from '../../integrations/relay/relay.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
    UsersModule,
    RelayModule,
  ],
  controllers: [UserInvitationsController],
  providers: [UserInvitationsService],
  exports: [UserInvitationsService],
})
export class UserInvitationsModule {}
