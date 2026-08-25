import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CommunicationToken, CommunicationTokenSchema } from './schemas/communication-token.schema';
import { CommunicationTokensService } from './communication-tokens.service';
import { CommunicationTokensController } from './communication-tokens.controller';
import { CommunicationTokensInternalController } from './communication-tokens-internal.controller';

@Module({
  imports: [
    AuthModule,
    OrganizationsModule,
    MongooseModule.forFeature([{ name: CommunicationToken.name, schema: CommunicationTokenSchema }]),
  ],
  controllers: [CommunicationTokensController, CommunicationTokensInternalController],
  providers: [CommunicationTokensService],
  exports: [CommunicationTokensService],
})
export class CommunicationTokensModule {}
