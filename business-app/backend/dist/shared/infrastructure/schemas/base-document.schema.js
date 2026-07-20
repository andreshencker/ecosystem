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
exports.BaseDocument = void 0;
const mongoose_1 = require("@nestjs/mongoose");
class BaseDocument {
    tenantId;
    createdBy;
    updatedBy;
    deletedAt;
    deletedBy;
    version;
    createdAt;
    updatedAt;
}
exports.BaseDocument = BaseDocument;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], BaseDocument.prototype, "tenantId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], BaseDocument.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], BaseDocument.prototype, "updatedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null, index: true }),
    __metadata("design:type", Object)
], BaseDocument.prototype, "deletedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], BaseDocument.prototype, "deletedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 1 }),
    __metadata("design:type", Number)
], BaseDocument.prototype, "version", void 0);
//# sourceMappingURL=base-document.schema.js.map