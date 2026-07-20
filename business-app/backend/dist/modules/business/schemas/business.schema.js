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
exports.BusinessSchema = exports.Business = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Business = class Business {
    businessKey;
    businessName;
    ownerUserId;
    abn;
    depositAccount;
    defaultCurrency;
    isActive;
    isPlatformCompany;
};
exports.Business = Business;
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
        index: true,
    }),
    __metadata("design:type", String)
], Business.prototype, "businessKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Business.prototype, "businessName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Business.prototype, "ownerUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Business.prototype, "abn", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            bsb: { type: String, default: null },
            accountNumber: { type: String, default: null },
        },
        _id: false,
        default: () => ({ bsb: null, accountNumber: null }),
    }),
    __metadata("design:type", Object)
], Business.prototype, "depositAccount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'AUD', trim: true, uppercase: true }),
    __metadata("design:type", String)
], Business.prototype, "defaultCurrency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true, index: true }),
    __metadata("design:type", Boolean)
], Business.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Business.prototype, "isPlatformCompany", void 0);
exports.Business = Business = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'businesses',
        timestamps: true,
        versionKey: false,
    })
], Business);
exports.BusinessSchema = mongoose_1.SchemaFactory.createForClass(Business);
exports.BusinessSchema.index({ isPlatformCompany: 1 }, { unique: true, partialFilterExpression: { isPlatformCompany: true } });
//# sourceMappingURL=business.schema.js.map