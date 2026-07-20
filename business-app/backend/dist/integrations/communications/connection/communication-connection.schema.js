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
exports.CommunicationConnectionSchema = exports.CommunicationConnection = exports.IntegrationConnectionSchema = exports.IntegrationConnection = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let IntegrationConnection = class IntegrationConnection {
    businessId;
    provider;
    encryptedToken;
    tokenPrefix;
    remoteCompanyId;
    isActive;
    lastTestedAt;
    lastStatus;
    lastError;
};
exports.IntegrationConnection = IntegrationConnection;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], IntegrationConnection.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, lowercase: true, index: true }),
    __metadata("design:type", String)
], IntegrationConnection.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], IntegrationConnection.prototype, "encryptedToken", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '' }),
    __metadata("design:type", String)
], IntegrationConnection.prototype, "tokenPrefix", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], IntegrationConnection.prototype, "remoteCompanyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true }),
    __metadata("design:type", Boolean)
], IntegrationConnection.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], IntegrationConnection.prototype, "lastTestedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['connected', 'failed'], default: null }),
    __metadata("design:type", Object)
], IntegrationConnection.prototype, "lastStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], IntegrationConnection.prototype, "lastError", void 0);
exports.IntegrationConnection = IntegrationConnection = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'integration_connections',
        versionKey: false,
        timestamps: true,
    })
], IntegrationConnection);
exports.IntegrationConnectionSchema = mongoose_1.SchemaFactory.createForClass(IntegrationConnection);
exports.IntegrationConnectionSchema.index({ businessId: 1, provider: 1 }, { unique: true, name: 'uniq_business_provider' });
exports.IntegrationConnectionSchema.index({ companyId: 1, provider: 1 }, { sparse: true, name: 'legacy_uniq_company_provider' });
exports.CommunicationConnection = IntegrationConnection;
exports.CommunicationConnectionSchema = exports.IntegrationConnectionSchema;
//# sourceMappingURL=communication-connection.schema.js.map