import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { GlobalAuthGuard } from './guards/global-auth.guard';
import { UsersModule } from '../../modules/users/users.module';

@Module({
  imports: [
    PassportModule,
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
    // UsersModule provides UsersService used by GlobalAuthGuard for DB-lookup RBAC.
    UsersModule,
  ],
  providers: [
    JwtStrategy,
    ApiKeyAuthGuard,
    GlobalAuthGuard,
    {
      provide: APP_GUARD,
      useClass: GlobalAuthGuard,
    },
  ],
  exports: [JwtModule, ApiKeyAuthGuard],
})
export class SecurityModule {}
