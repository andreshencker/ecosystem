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
var ApplicationAssignmentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationAssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const applications_service_1 = require("../applications/applications.service");
const users_service_1 = require("../users/users.service");
const application_assignment_schema_1 = require("./schemas/application-assignment.schema");
const DEFAULT_RELAY_USERS = [
    'grapiflydeveloper@gmail.com',
    'grapiflytrading@gmail.com',
    'grapiflyvideo@gmail.com',
    'andreshenckerq@gmail.com',
];
let ApplicationAssignmentsService = ApplicationAssignmentsService_1 = class ApplicationAssignmentsService {
    assignments;
    users;
    applications;
    config;
    logger = new common_1.Logger(ApplicationAssignmentsService_1.name);
    constructor(assignments, users, applications, config) {
        this.assignments = assignments;
        this.users = users;
        this.applications = applications;
        this.config = config;
    }
    async onApplicationBootstrap() {
        const relay = await this.applications.findByKey('relay');
        if (!relay) {
            this.logger.warn('Relay is not present in the application catalogue; access bootstrap skipped.');
            return;
        }
        const configured = this.config.get('RELAY_INITIAL_ACCESS_EMAILS');
        const emails = configured ? configured.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean) : DEFAULT_RELAY_USERS;
        let created = 0;
        for (const email of emails) {
            const user = await this.users.findByEmail(email);
            if (!user) {
                this.logger.warn(`Relay access pending: Grapifly user not found (${email}).`);
                continue;
            }
            await this.assignments.findOneAndUpdate({ grapiflyUserId: user.grapiflyUserId, applicationKey: 'relay' }, { $set: { status: 'active' }, $setOnInsert: { source: 'bootstrap', grantedAt: new Date() } }, { upsert: true, returnDocument: 'after' });
            created += 1;
        }
        this.logger.log(`Relay access catalogue ready (${created} active assignments).`);
    }
    async listAll() {
        const [assignments, users, applications] = await Promise.all([
            this.assignments.find().sort({ applicationKey: 1, grantedAt: 1 }).lean(),
            this.users.listAll(),
            this.applications.listAll(),
        ]);
        const usersById = new Map(users.map((user) => [user.grapiflyUserId, user]));
        const appsByKey = new Map(applications.map((app) => [app.key, app]));
        return assignments.map((assignment) => ({
            ...assignment,
            user: usersById.get(assignment.grapiflyUserId) ?? null,
            application: appsByKey.get(assignment.applicationKey) ?? null,
        }));
    }
    hasActiveAccess(grapiflyUserId, applicationKey) {
        return this.assignments.exists({ grapiflyUserId, applicationKey, status: 'active' });
    }
};
exports.ApplicationAssignmentsService = ApplicationAssignmentsService;
exports.ApplicationAssignmentsService = ApplicationAssignmentsService = ApplicationAssignmentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(application_assignment_schema_1.ApplicationAssignment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        applications_service_1.ApplicationsService,
        config_1.ConfigService])
], ApplicationAssignmentsService);
//# sourceMappingURL=application-assignments.service.js.map