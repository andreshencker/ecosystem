"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const users_module_1 = require("../users/users.module");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const google_strategy_1 = require("./google.strategy");
const session_guard_1 = require("./session.guard");
const google_auth_guard_1 = require("./google-auth.guard");
const mongoose_1 = require("@nestjs/mongoose");
const sso_code_schema_1 = require("./schemas/sso-code.schema");
const organization_schema_1 = require("../organizations/schemas/organization.schema");
const organization_membership_schema_1 = require("../organizations/schemas/organization-membership.schema");
const organization_application_schema_1 = require("../organizations/schemas/organization-application.schema");
const organization_member_application_schema_1 = require("../organizations/schemas/organization-member-application.schema");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            mongoose_1.MongooseModule.forFeature([
                { name: sso_code_schema_1.SsoCode.name, schema: sso_code_schema_1.SsoCodeSchema },
                { name: organization_schema_1.Organization.name, schema: organization_schema_1.OrganizationSchema },
                { name: organization_membership_schema_1.OrganizationMembership.name, schema: organization_membership_schema_1.OrganizationMembershipSchema },
                { name: organization_application_schema_1.OrganizationApplication.name, schema: organization_application_schema_1.OrganizationApplicationSchema },
                { name: organization_member_application_schema_1.OrganizationMemberApplication.name, schema: organization_member_application_schema_1.OrganizationMemberApplicationSchema },
            ]),
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_SESSION_SECRET') ?? 'development-only-change-me',
                    signOptions: { expiresIn: '7d' },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, google_strategy_1.GoogleStrategy, google_auth_guard_1.GoogleAuthGuard, session_guard_1.SessionGuard],
        exports: [session_guard_1.SessionGuard, jwt_1.JwtModule],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map