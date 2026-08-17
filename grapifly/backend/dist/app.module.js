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
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("./auth/auth.module");
const health_controller_1 = require("./health.controller");
const users_module_1 = require("./users/users.module");
const applications_module_1 = require("./applications/applications.module");
const platform_admin_module_1 = require("./admin/platform-admin.module");
const application_assignments_module_1 = require("./access/application-assignments.module");
const organizations_module_1 = require("./organizations/organizations.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            mongoose_1.MongooseModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: config.get('MONGODB_URI') ?? 'mongodb://localhost:27019/grapifly_identity',
                }),
            }),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            applications_module_1.ApplicationsModule,
            application_assignments_module_1.ApplicationAssignmentsModule,
            organizations_module_1.OrganizationsModule,
            platform_admin_module_1.PlatformAdminModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map