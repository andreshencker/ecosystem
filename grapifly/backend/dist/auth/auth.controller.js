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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const session_guard_1 = require("./session.guard");
const google_auth_guard_1 = require("./google-auth.guard");
let AuthController = class AuthController {
    auth;
    config;
    constructor(auth, config) {
        this.auth = auth;
        this.config = config;
    }
    googleLogin() { }
    continueInvitation(token, response) {
        response.cookie('grapifly_invitation_token', token, {
            httpOnly: true,
            secure: this.config.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000,
            path: '/',
        });
        return response.redirect('/auth/google?flow=invitation');
    }
    async googleCallback(request, response) {
        const { sessionToken } = await this.auth.loginWithGoogle(request.user);
        response.cookie('grapifly_session', sessionToken, {
            httpOnly: true,
            secure: this.config.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        if (request.query.state === 'relay') {
            const organizationId = request.cookies?.grapifly_sso_organization;
            response.clearCookie('grapifly_sso_organization', { path: '/' });
            return response.redirect(`/auth/sso/relay${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''}`);
        }
        if (request.query.state === 'invitation') {
            const invitationToken = request.cookies?.grapifly_invitation_token;
            response.clearCookie('grapifly_invitation_token', { path: '/' });
            if (invitationToken) {
                const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3100';
                return response.redirect(`${frontendUrl.replace(/\/$/, '')}/invitations/${encodeURIComponent(invitationToken)}`);
            }
        }
        return response.redirect(`${this.config.get('FRONTEND_URL') ?? 'http://localhost:3100'}/home`);
    }
    async me(request) {
        return this.auth.getUser(request.grapiflySession.sub);
    }
    logout(response) {
        response.clearCookie('grapifly_session', { path: '/' });
        return response.status(204).send();
    }
    logoutFromRelay(response) {
        response.clearCookie('grapifly_session', { path: '/' });
        const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3100';
        return response.redirect(`${frontendUrl.replace(/\/$/, '')}/?signedOut=true`);
    }
    async relaySso(request, response) {
        const token = request.cookies?.grapifly_session;
        const session = await this.auth.resolveSession(token);
        if (!session) {
            const organizationId = typeof request.query.organizationId === 'string' ? request.query.organizationId : undefined;
            if (organizationId) {
                response.cookie('grapifly_sso_organization', organizationId, {
                    httpOnly: true,
                    secure: this.config.get('NODE_ENV') === 'production',
                    sameSite: 'lax',
                    maxAge: 5 * 60 * 1000,
                    path: '/',
                });
            }
            return response.redirect('/auth/google?app=relay');
        }
        const organizationId = typeof request.query.organizationId === 'string' ? request.query.organizationId : undefined;
        const code = await this.auth.createRelaySsoCode(session.sub, organizationId);
        const callback = this.config.get('RELAY_SSO_CALLBACK_URL') ?? 'http://localhost:3000/auth/grapifly/callback';
        return response.redirect(`${callback}?code=${encodeURIComponent(code)}`);
    }
    exchangeSso(body, clientSecret) {
        return this.auth.exchangeSsoCode(body.code, body.appKey, clientSecret);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('google'),
    (0, common_1.UseGuards)(google_auth_guard_1.GoogleAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleLogin", null);
__decorate([
    (0, common_1.Get)('google/invitation/:token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "continueInvitation", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    (0, common_1.UseGuards)(google_auth_guard_1.GoogleAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('logout/relay'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logoutFromRelay", null);
__decorate([
    (0, common_1.Get)('sso/relay'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "relaySso", null);
__decorate([
    (0, common_1.Post)('sso/exchange'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-grapifly-sso-secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "exchangeSso", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService, config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map