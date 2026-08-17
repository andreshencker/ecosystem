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
exports.OrganizationInvitationSchema = exports.OrganizationInvitation = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let OrganizationInvitation = class OrganizationInvitation {
    invitationId;
    organizationId;
    email;
    role;
    applicationKeys;
    applicationRoles;
    tokenHash;
    invitedBy;
    status;
    expiresAt;
    acceptedAt;
};
exports.OrganizationInvitation = OrganizationInvitation;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], OrganizationInvitation.prototype, "invitationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], OrganizationInvitation.prototype, "organizationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true, index: true }),
    __metadata("design:type", String)
], OrganizationInvitation.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['admin', 'member'], default: 'member' }),
    __metadata("design:type", String)
], OrganizationInvitation.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], OrganizationInvitation.prototype, "applicationKeys", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], OrganizationInvitation.prototype, "applicationRoles", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, select: false }),
    __metadata("design:type", String)
], OrganizationInvitation.prototype, "tokenHash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrganizationInvitation.prototype, "invitedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['pending', 'accepted', 'cancelled', 'expired'], default: 'pending', index: true }),
    __metadata("design:type", String)
], OrganizationInvitation.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], OrganizationInvitation.prototype, "expiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], OrganizationInvitation.prototype, "acceptedAt", void 0);
exports.OrganizationInvitation = OrganizationInvitation = __decorate([
    (0, mongoose_1.Schema)({ collection: 'organization_invitations', timestamps: true, versionKey: false })
], OrganizationInvitation);
exports.OrganizationInvitationSchema = mongoose_1.SchemaFactory.createForClass(OrganizationInvitation);
exports.OrganizationInvitationSchema.index({ organizationId: 1, email: 1, status: 1 });
//# sourceMappingURL=organization-invitation.schema.js.map