"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationAssignmentsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const applications_module_1 = require("../applications/applications.module");
const users_module_1 = require("../users/users.module");
const application_assignments_service_1 = require("./application-assignments.service");
const application_assignment_schema_1 = require("./schemas/application-assignment.schema");
let ApplicationAssignmentsModule = class ApplicationAssignmentsModule {
};
exports.ApplicationAssignmentsModule = ApplicationAssignmentsModule;
exports.ApplicationAssignmentsModule = ApplicationAssignmentsModule = __decorate([
    (0, common_1.Module)({
        imports: [users_module_1.UsersModule, applications_module_1.ApplicationsModule, mongoose_1.MongooseModule.forFeature([{ name: application_assignment_schema_1.ApplicationAssignment.name, schema: application_assignment_schema_1.ApplicationAssignmentSchema }])],
        providers: [application_assignments_service_1.ApplicationAssignmentsService],
        exports: [application_assignments_service_1.ApplicationAssignmentsService],
    })
], ApplicationAssignmentsModule);
//# sourceMappingURL=application-assignments.module.js.map