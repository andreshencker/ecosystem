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
exports.PlatformAdminController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../auth/session.guard");
const applications_service_1 = require("../applications/applications.service");
const application_assignments_service_1 = require("../access/application-assignments.service");
const users_service_1 = require("../users/users.service");
const platform_admin_guard_1 = require("./platform-admin.guard");
const platform_admin_service_1 = require("./platform-admin.service");
let PlatformAdminController = class PlatformAdminController {
    admins;
    users;
    applications;
    assignments;
    constructor(admins, users, applications, assignments) {
        this.admins = admins;
        this.users = users;
        this.applications = applications;
        this.assignments = assignments;
    }
    me(request) {
        return this.admins.requireActiveAdmin(request.grapiflySession.sub);
    }
    async listUsers() {
        const users = await this.users.listAll();
        return { users, total: users.length };
    }
    async listApplications() {
        const applications = await this.applications.listAll();
        return { applications, total: applications.length };
    }
    async listAccess() {
        const assignments = await this.assignments.listAll();
        return { assignments, total: assignments.length };
    }
};
exports.PlatformAdminController = PlatformAdminController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PlatformAdminController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformAdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('applications'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformAdminController.prototype, "listApplications", null);
__decorate([
    (0, common_1.Get)('access'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformAdminController.prototype, "listAccess", null);
exports.PlatformAdminController = PlatformAdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard, platform_admin_guard_1.PlatformAdminGuard),
    __metadata("design:paramtypes", [platform_admin_service_1.PlatformAdminService,
        users_service_1.UsersService,
        applications_service_1.ApplicationsService,
        application_assignments_service_1.ApplicationAssignmentsService])
], PlatformAdminController);
//# sourceMappingURL=platform-admin.controller.js.map