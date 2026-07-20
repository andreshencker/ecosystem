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
import { PlatformMailModule } from './infrastructure/platform-mail/platform-mail.module';
import { SecurityModule } from './infrastructure/security/security.module';

// ─── Platform (SaaS layer) ────────────────────────────────────────────────────
import { AuthModule } from './platform/auth/auth.module';
import { UsersModule } from './platform/users/users.module';

// ─── Communication engine ─────────────────────────────────────────────────────
import { CompanyModule } from './communication/company/company-info/company.module';
import { CompanyThemeModule } from './communication/company/company-theme/company-theme.module';
import { ChannelsCatalogModule } from './communication/channels/channels-catalogue/channels-catalog.module';
import { ProviderCredentialsModule } from './communication/channels/provider-credentials/provider-credentials.module';
import { NotificationModule } from './communication/notifications/notification.module';
import { DomainCatalogueModule } from './communication/notifications/events/domain-catalogue/domain-catalogue.module';
import { FilesModule } from './communication/files/files.module';
import { PreviewModule } from './communication/preview/preview.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),

    // ── Infrastructure (order matters: Database and Redis before everything else)
    DatabaseModule,
    RedisModule,
    QueueModule,
    LoggingModule,
    HealthModule,
    PlatformMailModule,
    SecurityModule,

    // ── Platform (SaaS layer)
    UsersModule,
    AuthModule,

    // ── Communication engine
    CompanyModule,
    CompanyThemeModule,
    ChannelsCatalogModule,
    ProviderCredentialsModule,
    NotificationModule,
    DomainCatalogueModule,
    FilesModule,
    PreviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
