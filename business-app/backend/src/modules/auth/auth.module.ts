import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { CommunicationsModule } from '../../integrations/communications/communications.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('JWT_ACCESS_SECRET') ??
          'phase1a-placeholder-replace-before-phase1b',
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') ||
            '15m') as any,
        },
      }),
    }),

    UsersModule,
    CommunicationsModule,
    ProvisioningModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
