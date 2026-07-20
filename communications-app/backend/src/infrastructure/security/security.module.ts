import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { GlobalAuthGuard } from './guards/global-auth.guard';
import { CompanyIntegrationsModule } from '../../communication/company/integrations/company-integrations.module';

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
          // Cast required: @nestjs/jwt v11 uses the branded StringValue type
          // from the `ms` library — a plain string literal satisfies it at runtime.
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') ||
            '15m') as any,
        },
      }),
    }),
    // Required so GlobalAuthGuard can validate x-integration-token headers.
    // No circular dependency: CompanyIntegrationsModule does not import SecurityModule.
    CompanyIntegrationsModule,
  ],
  providers: [
    JwtStrategy,
    ApiKeyAuthGuard,
    GlobalAuthGuard,
    // Register GlobalAuthGuard as the application-wide guard.
    // Every route is protected by default; use @Public() to opt out.
    {
      provide: APP_GUARD,
      useClass: GlobalAuthGuard,
    },
  ],
  // Export JwtModule so AuthModule can inject JwtService in Phase 1B.
  exports: [JwtModule, ApiKeyAuthGuard],
})
export class SecurityModule {}
