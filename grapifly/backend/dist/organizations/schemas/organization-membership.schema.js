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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationMembershipSchema = exports.OrganizationMembership = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let OrganizationMembership = class OrganizationMembership {
    membershipId;
    organizationId;
    grapiflyUserId;
    role;
    status;
};
exports.OrganizationMembership = OrganizationMembership;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], OrganizationMembership.prototype, "membershipId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], OrganizationMembership.prototype, "organizationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], OrganizationMembership.prototype, "grapiflyUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['owner', 'admin', 'member'], default: 'member' }),
    __metadata("design:type", String)
], OrganizationMembership.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'suspended', 'revoked'], default: 'active', index: true }),
    __metadata("design:type", String)
], OrganizationMembership.prototype, "status", void 0);
exports.OrganizationMembership = OrganizationMembership = __decorate([
    (0, mongoose_1.Schema)({ collection: 'organization_memberships', timestamps: true, versionKey: false })
], OrganizationMembership);
exports.OrganizationMembershipSchema = mongoose_1.SchemaFactory.createForClass(OrganizationMembership);
exports.OrganizationMembershipSchema.index({ organizationId: 1, grapiflyUserId: 1 }, { unique: true });
//# sourceMappingURL=organization-membership.schema.js.map