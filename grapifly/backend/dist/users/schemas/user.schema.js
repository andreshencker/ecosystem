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
exports.GrapiflyUserSchema = exports.GrapiflyUser = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let GrapiflyUser = class GrapiflyUser {
    grapiflyUserId;
    provider;
    providerSubject;
    email;
    emailVerified;
    displayName;
    avatarUrl;
    isActive;
    lastLoginAt;
};
exports.GrapiflyUser = GrapiflyUser;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], GrapiflyUser.prototype, "grapiflyUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['google'], index: true }),
    __metadata("design:type", String)
], GrapiflyUser.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], GrapiflyUser.prototype, "providerSubject", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true, index: true }),
    __metadata("design:type", String)
], GrapiflyUser.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], GrapiflyUser.prototype, "emailVerified", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], GrapiflyUser.prototype, "displayName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], GrapiflyUser.prototype, "avatarUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], GrapiflyUser.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: Date.now }),
    __metadata("design:type", Date)
], GrapiflyUser.prototype, "lastLoginAt", void 0);
exports.GrapiflyUser = GrapiflyUser = __decorate([
    (0, mongoose_1.Schema)({ collection: 'grapifly_users', timestamps: true, versionKey: false })
], GrapiflyUser);
exports.GrapiflyUserSchema = mongoose_1.SchemaFactory.createForClass(GrapiflyUser);
exports.GrapiflyUserSchema.index({ provider: 1, providerSubject: 1 }, { unique: true });
//# sourceMappingURL=user.schema.js.map