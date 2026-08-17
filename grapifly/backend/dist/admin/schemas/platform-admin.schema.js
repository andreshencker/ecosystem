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
exports.PlatformAdminSchema = exports.PlatformAdmin = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let PlatformAdmin = class PlatformAdmin {
    grapiflyUserId;
    email;
    role;
    status;
};
exports.PlatformAdmin = PlatformAdmin;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], PlatformAdmin.prototype, "grapiflyUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true, unique: true, index: true }),
    __metadata("design:type", String)
], PlatformAdmin.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['ecosystem_super_admin'], index: true }),
    __metadata("design:type", String)
], PlatformAdmin.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'suspended'], default: 'active', index: true }),
    __metadata("design:type", String)
], PlatformAdmin.prototype, "status", void 0);
exports.PlatformAdmin = PlatformAdmin = __decorate([
    (0, mongoose_1.Schema)({ collection: 'platform_admins', timestamps: true, versionKey: false })
], PlatformAdmin);
exports.PlatformAdminSchema = mongoose_1.SchemaFactory.createForClass(PlatformAdmin);
//# sourceMappingURL=platform-admin.schema.js.map