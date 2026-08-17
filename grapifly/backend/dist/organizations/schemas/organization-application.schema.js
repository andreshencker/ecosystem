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
exports.OrganizationApplicationSchema = exports.OrganizationApplication = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let OrganizationApplication = class OrganizationApplication {
    organizationId;
    applicationKey;
    status;
    enabledBy;
};
exports.OrganizationApplication = OrganizationApplication;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], OrganizationApplication.prototype, "organizationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true, index: true }),
    __metadata("design:type", String)
], OrganizationApplication.prototype, "applicationKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'suspended'], default: 'active' }),
    __metadata("design:type", String)
], OrganizationApplication.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrganizationApplication.prototype, "enabledBy", void 0);
exports.OrganizationApplication = OrganizationApplication = __decorate([
    (0, mongoose_1.Schema)({ collection: 'organization_applications', timestamps: true, versionKey: false })
], OrganizationApplication);
exports.OrganizationApplicationSchema = mongoose_1.SchemaFactory.createForClass(OrganizationApplication);
exports.OrganizationApplicationSchema.index({ organizationId: 1, applicationKey: 1 }, { unique: true });
//# sourceMappingURL=organization-application.schema.js.map