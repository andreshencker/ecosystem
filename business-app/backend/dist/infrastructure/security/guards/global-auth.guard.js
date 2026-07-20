"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const public_decorator_1 = require("../decorators/public.decorator");
const users_service_1 = require("../../../modules/users/users.service");
let GlobalAuthGuard = class GlobalAuthGuard {
    reflector;
    jwtService;
    config;
    users;
    constructor(reflector, jwtService, config, users) {
        this.reflector = reflector;
        this.jwtService = jwtService;
        this.config = config;
        this.users = users;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const authHeader = request.headers['authorization'];
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.slice(7).trim();
            try {
                const secret = this.config.get('JWT_ACCESS_SECRET') ??
                    'phase1a-placeholder-replace-before-phase1b';
                const payload = await this.jwtService.verifyAsync(token, { secret });
                if (payload.type !== 'access') {
                    throw new common_1.UnauthorizedException('Invalid token type');
                }
                const user = await this.users.findById(payload.sub);
                if (!user) {
                    throw new common_1.UnauthorizedException('User not found');
                }
                if (!user.isActive) {
                    throw new common_1.UnauthorizedException('Account is deactivated');
                }
                const authContext = {
                    actorType: 'user',
                    userId: payload.sub,
                    email: user.email,
                    role: user.role,
                    scope: user.scope ?? 'company',
                    companyId: user.companyId ? String(user.companyId) : null,
                    businessKey: user.businessKey ?? null,
                };
                request.authContext = authContext;
                return true;
            }
            catch (err) {
                if (err instanceof common_1.UnauthorizedException)
                    throw err;
                throw new common_1.UnauthorizedException('Invalid or expired token');
            }
        }
        const apiKeyHeader = request.headers['x-api-key'];
        if (apiKeyHeader) {
            const internalKey = this.config.get('COMMUNICATION_API_KEY');
            if (internalKey && apiKeyHeader === internalKey) {
                request.authContext = {
                    actorType: 'apikey',
                    keyId: 'internal',
                };
                return true;
            }
        }
        throw new common_1.UnauthorizedException('Authentication required');
    }
};
exports.GlobalAuthGuard = GlobalAuthGuard;
exports.GlobalAuthGuard = GlobalAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        jwt_1.JwtService,
        config_1.ConfigService,
        users_service_1.UsersService])
], GlobalAuthGuard);
//# sourceMappingURL=global-auth.guard.js.map