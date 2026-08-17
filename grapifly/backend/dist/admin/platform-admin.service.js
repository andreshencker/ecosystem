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
var PlatformAdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformAdminService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const users_service_1 = require("../users/users.service");
const platform_admin_schema_1 = require("./schemas/platform-admin.schema");
let PlatformAdminService = PlatformAdminService_1 = class PlatformAdminService {
    admins;
    users;
    config;
    logger = new common_1.Logger(PlatformAdminService_1.name);
    constructor(admins, users, config) {
        this.admins = admins;
        this.users = users;
        this.config = config;
    }
    async onApplicationBootstrap() {
        const email = (this.config.get('ECOSYSTEM_SUPER_ADMIN_EMAIL') ?? 'grapiflydeveloper@gmail.com').toLowerCase().trim();
        const user = await this.users.findByEmail(email);
        if (!user) {
            this.logger.warn(`Super admin seed pending: ${email} must sign in to Grapifly first.`);
            return;
        }
        await this.admins.findOneAndUpdate({ email }, { $set: { grapiflyUserId: user.grapiflyUserId, role: 'ecosystem_super_admin', status: 'active' }, $setOnInsert: { email } }, { upsert: true, returnDocument: 'after' });
        this.logger.log(`Platform admin ready: ${email} (ecosystem_super_admin).`);
    }
    async requireActiveAdmin(grapiflyUserId) {
        const admin = await this.admins.findOne({ grapiflyUserId, status: 'active' }).lean();
        if (!admin)
            throw new common_1.ForbiddenException('Grapifly administration access is required');
        return admin;
    }
};
exports.PlatformAdminService = PlatformAdminService;
exports.PlatformAdminService = PlatformAdminService = PlatformAdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(platform_admin_schema_1.PlatformAdmin.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        config_1.ConfigService])
], PlatformAdminService);
//# sourceMappingURL=platform-admin.service.js.map