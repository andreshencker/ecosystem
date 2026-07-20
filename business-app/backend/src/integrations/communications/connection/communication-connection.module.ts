import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import {
  IntegrationConnection,
  IntegrationConnectionSchema,
} from './communication-connection.schema';
import { CommunicationConnectionService } from './communication-connection.service';
import { CommunicationConnectionController } from './communication-connection.controller';
import { SecurityModule } from '../../../infrastructure/common/security/security.module';
import { User, UserSchema } from '../../../modules/users/schemas/user.schema';
import {
  Business,
  BusinessSchema,
} from '../../../modules/business/schemas/business.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IntegrationConnection.name, schema: IntegrationConnectionSchema },
      { name: User.name, schema: UserSchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
    HttpModule,
    SecurityModule,
  ],
  controllers: [CommunicationConnectionController],
  providers: [CommunicationConnectionService],
  exports: [CommunicationConnectionService],
})
export class CommunicationConnectionModule {}
