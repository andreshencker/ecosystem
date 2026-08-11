import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { SessionGuard } from './session.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { SsoCode, SsoCodeSchema } from './schemas/sso-code.schema';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { OrganizationMembership, OrganizationMembershipSchema } from '../organizations/schemas/organization-membership.schema';
import { OrganizationApplication, OrganizationApplicationSchema } from '../organizations/schemas/organization-application.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationSchema } from '../organizations/schemas/organization-member-application.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: SsoCode.name, schema: SsoCodeSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMembership.name, schema: OrganizationMembershipSchema },
      { name: OrganizationApplication.name, schema: OrganizationApplicationSchema },
      { name: OrganizationMemberApplication.name, schema: OrganizationMemberApplicationSchema },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SESSION_SECRET') ?? 'development-only-change-me',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, GoogleAuthGuard, SessionGuard],
  exports: [SessionGuard, JwtModule],
})
export class AuthModule {}
