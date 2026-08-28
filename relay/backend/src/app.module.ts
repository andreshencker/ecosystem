import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// ─── Infrastructure ───────────────────────────────────────────────────────────
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { RequestIdMiddleware } from './infrastructure/logging/request-id.middleware';
import { HealthModule } from './infrastructure/health/health.module';
import { SecurityModule } from './infrastructure/security/security.module';
import { EventBusModule } from './infrastructure/events/event-bus.module';

// ─── Platform (SaaS layer) ────────────────────────────────────────────────────
import { AuthModule } from './auth/auth.module';
import { CompanyPortalModule } from './ecosystem/organization-portal/company-portal.module';

// ─── Communication engine ─────────────────────────────────────────────────────
import { CompanyModule } from './communication/company/company-info/company.module';
import { CompanyThemeModule } from './communication/company/company-theme/company-theme.module';
import { ChannelsCatalogModule } from './communication/channels/channels-catalogue/channels-catalog.module';
import { ProvidersModule } from './communication/channels/providers/providers.module';
import { CompanyChannelProvidersModule } from './communication/channels/company-channel-providers/company-channel-providers.module';
import { ProviderCredentialsModule } from './communication/channels/provider-credentials/provider-credentials.module';
import { GmailOAuthModule } from './communication/channels/implementation/email/oauth/gmail-oauth.module';
import { OAuthApplicationsModule } from './communication/channels/oauth-applications/oauth-applications.module';
import { GoogleIdentityOAuthModule } from './communication/channels/implementation/identity/oauth/google-identity-oauth.module';
import { LayoutTemplatesModule } from './communication/notifications/template/layout-templates/layout-templates.module';
import { NotificationModule } from './communication/notifications/notification.module';
import { DomainCatalogueModule } from './communication/notifications/events/domain-catalogue/domain-catalogue.module';
import { FilesModule } from './files/files.module';
import { PreviewModule } from './communication/preview/preview.module';
import { CalendarModule } from './calendar/calendar.module';
import { PaymentsModule } from './payments/payments.module';
import { AccountingModule } from './accounting/accounting.module';
import { EcosystemModule } from './ecosystem/ecosystem.module';
import { GrapiflyIntegrationModule } from './integrations/grapifly/grapifly-integration.module';
import { PlatformsModule } from './platforms/platforms.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),

    // ── Infrastructure (order matters: Database and Redis before everything else)
    DatabaseModule,
    RedisModule,
    QueueModule,
    LoggingModule,
    HealthModule,
    SecurityModule,
    EventBusModule,

    // ── Platform (SaaS layer)
    AuthModule,
    CompanyPortalModule,
    EcosystemModule,
    GrapiflyIntegrationModule,

    // ── Communication engine
    CompanyModule,
    CompanyThemeModule,
    ChannelsCatalogModule,
    ProvidersModule,
    CompanyChannelProvidersModule,
    ProviderCredentialsModule,
    GmailOAuthModule,
    OAuthApplicationsModule,
    GoogleIdentityOAuthModule,
    LayoutTemplatesModule,
    NotificationModule,
    DomainCatalogueModule,
    FilesModule,
    PreviewModule,

    // ── Reference data
    PlatformsModule,

    // ── Calendar
    CalendarModule,

    // ── Payments
    PaymentsModule,

    // ── Accounting
    AccountingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
