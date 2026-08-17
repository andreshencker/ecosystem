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
var EmployeesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const users_service_1 = require("../users/users.service");
const employee_profile_schema_1 = require("./schemas/employee-profile.schema");
let EmployeesService = EmployeesService_1 = class EmployeesService {
    employees;
    users;
    config;
    logger = new common_1.Logger(EmployeesService_1.name);
    constructor(employees, users, config) {
        this.employees = employees;
        this.users = users;
        this.config = config;
    }
    async onApplicationBootstrap() {
        const email = (this.config.get('ECOSYSTEM_SUPER_ADMIN_EMAIL') ?? 'grapiflydeveloper@gmail.com')
            .toLowerCase()
            .trim();
        const user = await this.users.findByEmail(email);
        if (!user) {
            this.logger.warn(`Super admin seed pending: ${email} must sign in to Grapifly first.`);
            return;
        }
        await this.employees.findOneAndUpdate({ email }, {
            $set: {
                grapiflyUserId: user.grapiflyUserId,
                role: 'ecosystem_super_admin',
                status: 'active',
                department: 'Platform',
                title: 'Ecosystem Super Admin',
            },
            $setOnInsert: { email },
        }, { upsert: true, new: true });
        this.logger.log(`Employee seed ready: ${email} (ecosystem_super_admin).`);
    }
    async requireActiveEmployee(grapiflyUserId) {
        const employee = await this.employees.findOne({ grapiflyUserId, status: 'active' }).lean();
        if (!employee)
            throw new common_1.ForbiddenException('Employee portal access is required');
        return employee;
    }
    findActiveEmployee(grapiflyUserId) {
        return this.employees.findOne({ grapiflyUserId, status: 'active' }).lean();
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = EmployeesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(employee_profile_schema_1.EmployeeProfile.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        config_1.ConfigService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map