import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { UsersModule } from './users/users.module';
import { ApplicationsModule } from './applications/applications.module';
import { PlatformAdminModule } from './admin/platform-admin.module';
import { ApplicationAssignmentsModule } from './access/application-assignments.module';
import { OrganizationsModule } from './organizations/organizations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') ?? 'mongodb://localhost:27019/grapifly_identity',
      }),
    }),
    UsersModule,
    AuthModule,
    ApplicationsModule,
    ApplicationAssignmentsModule,
    OrganizationsModule,
    PlatformAdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
