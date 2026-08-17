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
exports.SsoCodeSchema = exports.SsoCode = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let SsoCode = class SsoCode {
    codeHash;
    grapiflyUserId;
    appKey;
    organizationId;
    expiresAt;
    consumedAt;
};
exports.SsoCode = SsoCode;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], SsoCode.prototype, "codeHash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SsoCode.prototype, "grapiflyUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['relay'], index: true }),
    __metadata("design:type", String)
], SsoCode.prototype, "appKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SsoCode.prototype, "organizationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], SsoCode.prototype, "expiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], SsoCode.prototype, "consumedAt", void 0);
exports.SsoCode = SsoCode = __decorate([
    (0, mongoose_1.Schema)({ collection: 'sso_codes', timestamps: true, versionKey: false })
], SsoCode);
exports.SsoCodeSchema = mongoose_1.SchemaFactory.createForClass(SsoCode);
exports.SsoCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
//# sourceMappingURL=sso-code.schema.js.map