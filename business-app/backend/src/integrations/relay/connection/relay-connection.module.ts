import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import {
  IntegrationConnection,
  IntegrationConnectionSchema,
} from './relay-connection.schema';
import { RelayConnectionService } from './relay-connection.service';
import { RelayConnectionController } from './relay-connection.controller';
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
  controllers: [RelayConnectionController],
  providers: [RelayConnectionService],
  exports: [RelayConnectionService],
})
export class RelayConnectionModule {}
