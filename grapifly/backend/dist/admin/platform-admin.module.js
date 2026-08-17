"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformAdminModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const applications_module_1 = require("../applications/applications.module");
const application_assignments_module_1 = require("../access/application-assignments.module");
const auth_module_1 = require("../auth/auth.module");
const users_module_1 = require("../users/users.module");
const platform_admin_controller_1 = require("./platform-admin.controller");
const platform_admin_guard_1 = require("./platform-admin.guard");
const platform_admin_service_1 = require("./platform-admin.service");
const platform_admin_schema_1 = require("./schemas/platform-admin.schema");
let PlatformAdminModule = class PlatformAdminModule {
};
exports.PlatformAdminModule = PlatformAdminModule;
exports.PlatformAdminModule = PlatformAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, users_module_1.UsersModule, applications_module_1.ApplicationsModule, application_assignments_module_1.ApplicationAssignmentsModule, mongoose_1.MongooseModule.forFeature([{ name: platform_admin_schema_1.PlatformAdmin.name, schema: platform_admin_schema_1.PlatformAdminSchema }])],
        controllers: [platform_admin_controller_1.PlatformAdminController],
        providers: [platform_admin_service_1.PlatformAdminService, platform_admin_guard_1.PlatformAdminGuard],
    })
], PlatformAdminModule);
//# sourceMappingURL=platform-admin.module.js.map