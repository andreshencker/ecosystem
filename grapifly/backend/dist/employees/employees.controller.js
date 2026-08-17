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
exports.EmployeesController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../auth/session.guard");
const users_service_1 = require("../users/users.service");
const employee_guard_1 = require("./employee.guard");
const employees_service_1 = require("./employees.service");
let EmployeesController = class EmployeesController {
    employees;
    users;
    constructor(employees, users) {
        this.employees = employees;
        this.users = users;
    }
    me(request) {
        return this.employees.requireActiveEmployee(request.grapiflySession.sub);
    }
    async listUsers() {
        const users = await this.users.listAll();
        return { users, total: users.length };
    }
};
exports.EmployeesController = EmployeesController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "listUsers", null);
exports.EmployeesController = EmployeesController = __decorate([
    (0, common_1.Controller)('internal'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard, employee_guard_1.EmployeeGuard),
    __metadata("design:paramtypes", [employees_service_1.EmployeesService,
        users_service_1.UsersService])
], EmployeesController);
//# sourceMappingURL=employees.controller.js.map