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
exports.ApplicationAssignmentSchema = exports.ApplicationAssignment = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let ApplicationAssignment = class ApplicationAssignment {
    grapiflyUserId;
    applicationKey;
    status;
    source;
    grantedAt;
};
exports.ApplicationAssignment = ApplicationAssignment;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ApplicationAssignment.prototype, "grapiflyUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, lowercase: true, trim: true, index: true }),
    __metadata("design:type", String)
], ApplicationAssignment.prototype, "applicationKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['active', 'suspended', 'revoked'], default: 'active', index: true }),
    __metadata("design:type", String)
], ApplicationAssignment.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['bootstrap', 'admin', 'migration'], default: 'admin' }),
    __metadata("design:type", String)
], ApplicationAssignment.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: Date.now }),
    __metadata("design:type", Date)
], ApplicationAssignment.prototype, "grantedAt", void 0);
exports.ApplicationAssignment = ApplicationAssignment = __decorate([
    (0, mongoose_1.Schema)({ collection: 'application_assignments', timestamps: true, versionKey: false })
], ApplicationAssignment);
exports.ApplicationAssignmentSchema = mongoose_1.SchemaFactory.createForClass(ApplicationAssignment);
exports.ApplicationAssignmentSchema.index({ grapiflyUserId: 1, applicationKey: 1 }, { unique: true });
//# sourceMappingURL=application-assignment.schema.js.map