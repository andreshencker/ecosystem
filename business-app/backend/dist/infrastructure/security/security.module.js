"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const api_key_auth_guard_1 = require("./guards/api-key-auth.guard");
const global_auth_guard_1 = require("./guards/global-auth.guard");
const users_module_1 = require("../../modules/users/users.module");
let SecurityModule = class SecurityModule {
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_ACCESS_SECRET') ??
                        'phase1a-placeholder-replace-before-phase1b',
                    signOptions: {
                        expiresIn: (config.get('JWT_ACCESS_EXPIRES_IN', '15m') ||
                            '15m'),
                    },
                }),
            }),
            users_module_1.UsersModule,
        ],
        providers: [
            jwt_strategy_1.JwtStrategy,
            api_key_auth_guard_1.ApiKeyAuthGuard,
            global_auth_guard_1.GlobalAuthGuard,
            {
                provide: core_1.APP_GUARD,
                useClass: global_auth_guard_1.GlobalAuthGuard,
            },
        ],
        exports: [jwt_1.JwtModule, api_key_auth_guard_1.ApiKeyAuthGuard],
    })
], SecurityModule);
//# sourceMappingURL=security.module.js.map