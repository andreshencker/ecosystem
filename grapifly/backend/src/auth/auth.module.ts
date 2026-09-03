import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { ApplicationsModule } from '../applications/applications.module';
import { ApplicationAssignmentsModule } from '../access/application-assignments.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { RelayGoogleCredentialsService } from './relay-google-credentials.service';
import { SessionGuard } from './session.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { SsoCode, SsoCodeSchema } from './schemas/sso-code.schema';
import { PendingSignup, PendingSignupSchema } from './schemas/pending-signup.schema';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { OrganizationMembership, OrganizationMembershipSchema } from '../organizations/schemas/organization-membership.schema';
import { OrganizationApplication, OrganizationApplicationSchema } from '../organizations/schemas/organization-application.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationSchema } from '../organizations/schemas/organization-member-application.schema';
import { RoleCatalogModule } from '../roles/role-catalog.module';
import { PlatformAdmin, PlatformAdminSchema } from '../admin/schemas/platform-admin.schema';

@Module({
  imports: [
    UsersModule,
    ApplicationsModule,
    ApplicationAssignmentsModule,
    RoleCatalogModule,
    MongooseModule.forFeature([
      { name: SsoCode.name, schema: SsoCodeSchema },
      { name: PendingSignup.name, schema: PendingSignupSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMembership.name, schema: OrganizationMembershipSchema },
      { name: OrganizationApplication.name, schema: OrganizationApplicationSchema },
      { name: OrganizationMemberApplication.name, schema: OrganizationMemberApplicationSchema },
      { name: PlatformAdmin.name, schema: PlatformAdminSchema },
    ]),
    PassportModule,
    HttpModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SESSION_SECRET') ?? 'development-only-change-me',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RelayGoogleCredentialsService,
    // The Google client id/secret come from Relay's OAuth-application store
    // (platform company's "google" registration) resolved once at startup,
    // falling back to GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars.
    {
      provide: GoogleStrategy,
      inject: [RelayGoogleCredentialsService, ConfigService],
      useFactory: async (
        relayCreds: RelayGoogleCredentialsService,
        config: ConfigService,
      ) => {
        const relay = await relayCreds.getGoogleClient();
        return new GoogleStrategy({
          clientID:
            relay?.clientId ??
            config.get<string>('GOOGLE_CLIENT_ID') ??
            'configure-google-client-id',
          clientSecret:
            relay?.clientSecret ??
            config.get<string>('GOOGLE_CLIENT_SECRET') ??
            'configure-google-client-secret',
          callbackURL:
            config.get<string>('GOOGLE_CALLBACK_URL') ??
            'http://localhost:3101/auth/google/callback',
        });
      },
    },
    GoogleAuthGuard,
    SessionGuard,
  ],
  exports: [SessionGuard, JwtModule],
})
export class AuthModule {}
