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
exports.OrganizationSchema = exports.Organization = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Organization = class Organization {
    organizationId;
    name;
    slug;
    createdBy;
    entityType;
    legalName;
    tagline;
    timezone;
    officialEmail;
    supportEmail;
    supportPhone;
    supportPhoneCountryCode;
    supportPhoneNumber;
    supportHours;
    addressLine1;
    addressLine2;
    addressCity;
    addressState;
    addressPostalCode;
    addressCountry;
    websiteUrl;
    apiBaseUrl;
    helpCenterUrl;
    privacyPolicyUrl;
    termsUrl;
    unsubscribeUrl;
    facebook;
    instagram;
    linkedin;
    x;
    youtube;
    tiktok;
    whatsapp;
    telegram;
    copyrightText;
    disclaimerShort;
    disclaimerLong;
    logoIconUrl;
    logoFullUrl;
    isPlatform;
    isDefault;
    status;
};
exports.Organization = Organization;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], Organization.prototype, "organizationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Organization.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true, unique: true, index: true }),
    __metadata("design:type", String)
], Organization.prototype, "slug", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Organization.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['company', 'individual'], default: 'company', index: true }),
    __metadata("design:type", String)
], Organization.prototype, "entityType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "legalName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "tagline", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'Australia/Sydney' }),
    __metadata("design:type", String)
], Organization.prototype, "timezone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '', lowercase: true, trim: true }),
    __metadata("design:type", String)
], Organization.prototype, "officialEmail", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '', lowercase: true, trim: true }),
    __metadata("design:type", String)
], Organization.prototype, "supportEmail", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "supportPhone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "supportPhoneCountryCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "supportPhoneNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "supportHours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "addressLine1", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "addressLine2", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "addressCity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "addressState", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "addressPostalCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "addressCountry", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "websiteUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "apiBaseUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "helpCenterUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "privacyPolicyUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "termsUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "unsubscribeUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "facebook", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "instagram", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "linkedin", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "x", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "youtube", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "tiktok", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "whatsapp", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "telegram", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "copyrightText", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "disclaimerShort", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "disclaimerLong", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "logoIconUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], Organization.prototype, "logoFullUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Organization.prototype, "isPlatform", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false, index: true }),
    __metadata("design:type", Boolean)
], Organization.prototype, "isDefault", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'suspended', 'archived'], default: 'active', index: true }),
    __metadata("design:type", String)
], Organization.prototype, "status", void 0);
exports.Organization = Organization = __decorate([
    (0, mongoose_1.Schema)({ collection: 'organizations', timestamps: true, versionKey: false })
], Organization);
exports.OrganizationSchema = mongoose_1.SchemaFactory.createForClass(Organization);
exports.OrganizationSchema.index({ isPlatform: 1 }, { unique: true, partialFilterExpression: { isPlatform: true } });
exports.OrganizationSchema.index({ createdBy: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });
//# sourceMappingURL=organization.schema.js.map