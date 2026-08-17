"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const user_schema_1 = require("./schemas/user.schema");
const users_service_1 = require("./users.service");
const organization_schema_1 = require("../organizations/schemas/organization.schema");
const organization_membership_schema_1 = require("../organizations/schemas/organization-membership.schema");
const organization_application_schema_1 = require("../organizations/schemas/organization-application.schema");
const organization_member_application_schema_1 = require("../organizations/schemas/organization-member-application.schema");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.GrapiflyUser.name, schema: user_schema_1.GrapiflyUserSchema },
                { name: organization_schema_1.Organization.name, schema: organization_schema_1.OrganizationSchema },
                { name: organization_membership_schema_1.OrganizationMembership.name, schema: organization_membership_schema_1.OrganizationMembershipSchema },
                { name: organization_application_schema_1.OrganizationApplication.name, schema: organization_application_schema_1.OrganizationApplicationSchema },
                { name: organization_member_application_schema_1.OrganizationMemberApplication.name, schema: organization_member_application_schema_1.OrganizationMemberApplicationSchema },
            ])],
        providers: [users_service_1.UsersService],
        exports: [users_service_1.UsersService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map