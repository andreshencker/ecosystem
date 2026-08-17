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
exports.EmployeeProfileSchema = exports.EmployeeProfile = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let EmployeeProfile = class EmployeeProfile {
    grapiflyUserId;
    email;
    role;
    status;
    department;
    title;
};
exports.EmployeeProfile = EmployeeProfile;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], EmployeeProfile.prototype, "grapiflyUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true, unique: true, index: true }),
    __metadata("design:type", String)
], EmployeeProfile.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['ecosystem_super_admin'], index: true }),
    __metadata("design:type", String)
], EmployeeProfile.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'suspended'], default: 'active', index: true }),
    __metadata("design:type", String)
], EmployeeProfile.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'Platform' }),
    __metadata("design:type", String)
], EmployeeProfile.prototype, "department", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'Ecosystem Super Admin' }),
    __metadata("design:type", String)
], EmployeeProfile.prototype, "title", void 0);
exports.EmployeeProfile = EmployeeProfile = __decorate([
    (0, mongoose_1.Schema)({ collection: 'employee_profiles', timestamps: true, versionKey: false })
], EmployeeProfile);
exports.EmployeeProfileSchema = mongoose_1.SchemaFactory.createForClass(EmployeeProfile);
//# sourceMappingURL=employee-profile.schema.js.map