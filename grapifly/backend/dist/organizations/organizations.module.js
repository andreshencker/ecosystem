"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const applications_module_1 = require("../applications/applications.module");
const auth_module_1 = require("../auth/auth.module");
const users_module_1 = require("../users/users.module");
const organization_application_schema_1 = require("./schemas/organization-application.schema");
const organization_invitation_schema_1 = require("./schemas/organization-invitation.schema");
const organization_membership_schema_1 = require("./schemas/organization-membership.schema");
const organization_member_application_schema_1 = require("./schemas/organization-member-application.schema");
const organization_schema_1 = require("./schemas/organization.schema");
const organizations_controller_1 = require("./organizations.controller");
const relay_team_controller_1 = require("./relay-team.controller");
const relay_organization_controller_1 = require("./relay-organization.controller");
const organizations_service_1 = require("./organizations.service");
let OrganizationsModule = class OrganizationsModule {
};
exports.OrganizationsModule = OrganizationsModule;
exports.OrganizationsModule = OrganizationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            applications_module_1.ApplicationsModule,
            mongoose_1.MongooseModule.forFeature([
                { name: organization_schema_1.Organization.name, schema: organization_schema_1.OrganizationSchema },
                { name: organization_membership_schema_1.OrganizationMembership.name, schema: organization_membership_schema_1.OrganizationMembershipSchema },
                { name: organization_member_application_schema_1.OrganizationMemberApplication.name, schema: organization_member_application_schema_1.OrganizationMemberApplicationSchema },
                { name: organization_application_schema_1.OrganizationApplication.name, schema: organization_application_schema_1.OrganizationApplicationSchema },
                { name: organization_invitation_schema_1.OrganizationInvitation.name, schema: organization_invitation_schema_1.OrganizationInvitationSchema },
            ]),
        ],
        controllers: [organizations_controller_1.OrganizationsController, relay_organization_controller_1.RelayOrganizationController, relay_team_controller_1.RelayTeamController],
        providers: [organizations_service_1.OrganizationsService],
        exports: [organizations_service_1.OrganizationsService],
    })
], OrganizationsModule);
//# sourceMappingURL=organizations.module.js.map