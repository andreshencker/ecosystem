// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './core/auth/auth.module';
import { UsersModule } from './core/users/users.module';
import { PlatformsModule } from './core/platforms/platforms.module';
import { UserPlatformsModule } from './core/user-platforms/user-platforms.module';
import { DatabaseModule } from './database/database.module';
import { CommunicationsClientModule } from './microservices/communications-client/communications-client.module';
import { OrchestratorClientModule } from './microservices/orchestrator-client/orchestrator-client.module';
import { IndicatorsModule } from './core/indicators/indicators.module';
import { AdminIndicatorsModule } from './core/admin-indicators/admin-indicators.module';
import { UserAccountInfoModule } from './core/user-account-info/user-account-infos.module';
import { AlertsModule } from './core/alerts/alerts.module';
import { SymbolExecutionsModule } from './core/symbol-executions/symbol-executions.module';
import { SymbolsModule } from './core/symbols/symbols.module';
import { CodeProjectsModule } from './core/code-projects/code-projects.module';
import { CodeProjectVersionsModule } from './core/code-project-versions/code-project-versions.module';
import { CompanyProvidersModule } from './core/company-provider/company-providers.module';
import { TypeProjectsModule } from './core/type-projects/type-projects.module';
import { ProjectCodePlatformsModule } from './core/project-code-platform/project-code-platforms.module';
import { UserProjectPlatformsModule } from './core/user-project-platform/user-project-platforms.module';
import { IndicatorProjectsModule } from './core/indicator-projects/indicator-projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    PlatformsModule,
    UserPlatformsModule,
    IndicatorsModule,
    AdminIndicatorsModule,
    UserAccountInfoModule,
    AlertsModule,
    SymbolExecutionsModule,
    CommunicationsClientModule,
    OrchestratorClientModule,
    SymbolsModule,
    CodeProjectsModule,
    CodeProjectVersionsModule,
    CompanyProvidersModule,
    TypeProjectsModule,
    ProjectCodePlatformsModule,
    UserProjectPlatformsModule,
    IndicatorProjectsModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
