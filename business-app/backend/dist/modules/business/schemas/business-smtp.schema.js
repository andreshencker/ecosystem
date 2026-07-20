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
exports.BusinessSmtpSchema = exports.BusinessSmtp = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let BusinessSmtp = class BusinessSmtp {
    companyId;
    fromEmail;
    fromName;
    credentials;
    isActive;
    verifiedAt;
};
exports.BusinessSmtp = BusinessSmtp;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true, unique: true }),
    __metadata("design:type", String)
], BusinessSmtp.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], BusinessSmtp.prototype, "fromEmail", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], BusinessSmtp.prototype, "fromName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: null }),
    __metadata("design:type", Object)
], BusinessSmtp.prototype, "credentials", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true }),
    __metadata("design:type", Boolean)
], BusinessSmtp.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], BusinessSmtp.prototype, "verifiedAt", void 0);
exports.BusinessSmtp = BusinessSmtp = __decorate([
    (0, mongoose_1.Schema)({ collection: 'company_smtp', timestamps: true, versionKey: false })
], BusinessSmtp);
exports.BusinessSmtpSchema = mongoose_1.SchemaFactory.createForClass(BusinessSmtp);
//# sourceMappingURL=business-smtp.schema.js.map