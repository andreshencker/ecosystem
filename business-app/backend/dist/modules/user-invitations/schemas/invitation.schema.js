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
exports.InvitationSchema = exports.Invitation = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Invitation = class Invitation {
    email;
    firstName;
    lastName;
    role;
    companyId;
    businessKey;
    tokenHash;
    expiresAt;
    status;
    userId;
    invitedByUserId;
    invitationScope;
    senderCredentialScope;
};
exports.Invitation = Invitation;
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], Invitation.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Invitation.prototype, "firstName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Invitation.prototype, "lastName", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: [
            'platform_admin',
            'business_owner',
            'business_admin',
            'accountant',
            'staff',
            'viewer',
        ],
    }),
    __metadata("design:type", String)
], Invitation.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Invitation.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Invitation.prototype, "businessKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Invitation.prototype, "tokenHash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Invitation.prototype, "expiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['pending', 'pending_delivery', 'accepted', 'expired', 'cancelled'],
        default: 'pending_delivery',
    }),
    __metadata("design:type", String)
], Invitation.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Invitation.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Invitation.prototype, "invitedByUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: ['platform', 'company'],
    }),
    __metadata("design:type", String)
], Invitation.prototype, "invitationScope", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: ['platform', 'company'],
    }),
    __metadata("design:type", String)
], Invitation.prototype, "senderCredentialScope", void 0);
exports.Invitation = Invitation = __decorate([
    (0, mongoose_1.Schema)({ collection: 'invitations', timestamps: true, versionKey: false })
], Invitation);
exports.InvitationSchema = mongoose_1.SchemaFactory.createForClass(Invitation);
exports.InvitationSchema.index({ tokenHash: 1 }, { unique: true });
exports.InvitationSchema.index({ email: 1 });
exports.InvitationSchema.index({ companyId: 1, status: 1 });
exports.InvitationSchema.index({ invitationScope: 1, status: 1 });
//# sourceMappingURL=invitation.schema.js.map