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
var ApplicationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const application_schema_1 = require("./schemas/application.schema");
const APPLICATION_CATALOGUE = [
    { key: 'relay', name: 'Relay', description: 'Secure connections and automation across external services.', launchUrl: 'http://localhost:3000', ownership: 'first_party', status: 'active', displayOrder: 1 },
    { key: 'business', name: 'Business', description: 'Business operations, invoicing and administration.', launchUrl: 'http://localhost:3003', ownership: 'first_party', status: 'active', displayOrder: 2 },
    { key: 'jtrade', name: 'JTrade', description: 'Trading, investment and market operations.', launchUrl: 'http://localhost:5173', ownership: 'first_party', status: 'active', displayOrder: 3 },
];
let ApplicationsService = ApplicationsService_1 = class ApplicationsService {
    applications;
    logger = new common_1.Logger(ApplicationsService_1.name);
    constructor(applications) {
        this.applications = applications;
    }
    async onApplicationBootstrap() {
        await Promise.all(APPLICATION_CATALOGUE.map((app) => this.applications.findOneAndUpdate({ key: app.key }, { $set: app }, { upsert: true, returnDocument: 'after' })));
        this.logger.log(`Application catalogue ready (${APPLICATION_CATALOGUE.length} applications).`);
    }
    listAll() {
        return this.applications.find().sort({ displayOrder: 1, name: 1 }).lean();
    }
    findByKey(key) {
        return this.applications.findOne({ key: key.toLowerCase(), status: 'active' }).lean();
    }
};
exports.ApplicationsService = ApplicationsService;
exports.ApplicationsService = ApplicationsService = ApplicationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(application_schema_1.Application.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ApplicationsService);
//# sourceMappingURL=applications.service.js.map