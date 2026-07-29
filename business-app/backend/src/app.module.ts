import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

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
import { OutboxModule } from './infrastructure/outbox/outbox.module';

// ─── Platform (SaaS layer) ────────────────────────────────────────────────────
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UserInvitationsModule } from './modules/user-invitations/user-invitations.module';
import { BusinessModule as BusinessPortalModule } from './modules/business/business.module';

// ─── Integrations ─────────────────────────────────────────────────────────────
import { CommunicationsModule } from './integrations/communications/communications.module';
import { CommunicationPurposesModule } from './integrations/communications/purposes/communication-purposes.module';
import { CommunicationEventsModule } from './integrations/communications/events/communication-events.module';

// ─── ERP Domains ──────────────────────────────────────────────────────────────
import { CustomerModule } from './modules/customer/customer.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { LinkedCalendarsModule } from './modules/linked-calendars/linked-calendars.module';
import { MdmModule } from './mdm/mdm.module';
import { InvoicesModule } from './modules/invoices/invoices.module';


// ─── Analytics Gateway (proxies to BI service) ───────────────────────────────
import { AnalyticsModule } from './analytics/analytics.module';

// ─── BI Contracts ─────────────────────────────────────────────────────────────
import { ShiftInvoiceModule } from './integrations/business-intelligence/contracts/invoice/shift-invoice';

// ─── Platform Admin ───────────────────────────────────────────────────────────
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),

    // Rate limiting (auth endpoints: 15 req/min; default for all others: 60/min)
    ThrottlerModule.forRoot([
      { name: 'auth', ttl: 60_000, limit: 15 },
      { name: 'default', ttl: 60_000, limit: 60 },
    ]),

    // ── Infrastructure
    DatabaseModule,
    RedisModule,
    QueueModule,
    LoggingModule,
    HealthModule,
    SecurityModule,
    EventBusModule,
    OutboxModule,

    // ── Platform (SaaS layer)
    UsersModule,
    UserInvitationsModule,
    AuthModule,
    BusinessPortalModule,

    // ── Integrations
    CommunicationsModule,
    CommunicationPurposesModule,
    CommunicationEventsModule,

    // ── ERP Domains (Sprint 1+)
    CustomerModule,
    ContractsModule,
    ShiftsModule,
    LinkedCalendarsModule,
    MdmModule,
    InvoicesModule,


    // ── Analytics Gateway
    AnalyticsModule,

    // ── BI Contracts
    ShiftInvoiceModule,

    // ── Platform Admin (cross-tenant read-only views)
    PlatformAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
