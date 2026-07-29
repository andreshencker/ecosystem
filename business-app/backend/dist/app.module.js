"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const database_module_1 = require("./infrastructure/database/database.module");
const redis_module_1 = require("./infrastructure/redis/redis.module");
const queue_module_1 = require("./infrastructure/queue/queue.module");
const logging_module_1 = require("./infrastructure/logging/logging.module");
const request_id_middleware_1 = require("./infrastructure/logging/request-id.middleware");
const health_module_1 = require("./infrastructure/health/health.module");
const security_module_1 = require("./infrastructure/security/security.module");
const event_bus_module_1 = require("./infrastructure/events/event-bus.module");
const outbox_module_1 = require("./infrastructure/outbox/outbox.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const user_invitations_module_1 = require("./modules/user-invitations/user-invitations.module");
const business_module_1 = require("./modules/business/business.module");
const communications_module_1 = require("./integrations/communications/communications.module");
const communication_purposes_module_1 = require("./integrations/communications/purposes/communication-purposes.module");
const communication_events_module_1 = require("./integrations/communications/events/communication-events.module");
const customer_module_1 = require("./modules/customer/customer.module");
const contracts_module_1 = require("./modules/contracts/contracts.module");
const shifts_module_1 = require("./modules/shifts/shifts.module");
const linked_calendars_module_1 = require("./modules/linked-calendars/linked-calendars.module");
const mdm_module_1 = require("./mdm/mdm.module");
const invoices_module_1 = require("./modules/invoices/invoices.module");
const analytics_module_1 = require("./analytics/analytics.module");
const shift_invoice_1 = require("./integrations/business-intelligence/contracts/invoice/shift-invoice");
const platform_admin_module_1 = require("./modules/platform-admin/platform-admin.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_id_middleware_1.RequestIdMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
            throttler_1.ThrottlerModule.forRoot([
                { name: 'auth', ttl: 60_000, limit: 15 },
                { name: 'default', ttl: 60_000, limit: 60 },
            ]),
            database_module_1.DatabaseModule,
            redis_module_1.RedisModule,
            queue_module_1.QueueModule,
            logging_module_1.LoggingModule,
            health_module_1.HealthModule,
            security_module_1.SecurityModule,
            event_bus_module_1.EventBusModule,
            outbox_module_1.OutboxModule,
            users_module_1.UsersModule,
            user_invitations_module_1.UserInvitationsModule,
            auth_module_1.AuthModule,
            business_module_1.BusinessModule,
            communications_module_1.CommunicationsModule,
            communication_purposes_module_1.CommunicationPurposesModule,
            communication_events_module_1.CommunicationEventsModule,
            customer_module_1.CustomerModule,
            contracts_module_1.ContractsModule,
            shifts_module_1.ShiftsModule,
            linked_calendars_module_1.LinkedCalendarsModule,
            mdm_module_1.MdmModule,
            invoices_module_1.InvoicesModule,
            analytics_module_1.AnalyticsModule,
            shift_invoice_1.ShiftInvoiceModule,
            platform_admin_module_1.PlatformAdminModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard }],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map