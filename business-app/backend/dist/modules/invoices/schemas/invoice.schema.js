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
exports.InvoiceSchema = exports.Invoice = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Invoice = class Invoice {
    businessId;
    customerId;
    customerName;
    contractId;
    invoiceNumber;
    invoiceDate;
    dueDate;
    periodStart;
    periodEnd;
    currency;
    shiftIds;
    additionalConcepts;
    subtotal;
    taxAmount;
    total;
    amountPaid;
    balance;
    groupId;
    status;
    sentAt;
    lastReminderAt;
    reminderCount;
    paidAt;
    paymentReference;
    paymentNotes;
    voidedAt;
    voidReason;
};
exports.Invoice = Invoice;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Invoice.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Invoice.prototype, "customerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Invoice.prototype, "customerName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Invoice.prototype, "contractId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Invoice.prototype, "invoiceNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Invoice.prototype, "invoiceDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Invoice.prototype, "dueDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Invoice.prototype, "periodStart", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Invoice.prototype, "periodEnd", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'AUD' }),
    __metadata("design:type", String)
], Invoice.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], required: true }),
    __metadata("design:type", Array)
], Invoice.prototype, "shiftIds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], Invoice.prototype, "additionalConcepts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Invoice.prototype, "subtotal", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Invoice.prototype, "taxAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Invoice.prototype, "total", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: '0.00' }),
    __metadata("design:type", String)
], Invoice.prototype, "amountPaid", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: '0.00' }),
    __metadata("design:type", String)
], Invoice.prototype, "balance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Invoice.prototype, "groupId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['approved', 'outstanding', 'sent', 'send_failed', 'paid', 'voided'],
        default: 'approved',
    }),
    __metadata("design:type", String)
], Invoice.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Invoice.prototype, "sentAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Invoice.prototype, "lastReminderAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Invoice.prototype, "reminderCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Invoice.prototype, "paidAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Invoice.prototype, "paymentReference", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Invoice.prototype, "paymentNotes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Invoice.prototype, "voidedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Invoice.prototype, "voidReason", void 0);
exports.Invoice = Invoice = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'invoices',
        timestamps: true,
        versionKey: false,
    })
], Invoice);
exports.InvoiceSchema = mongoose_1.SchemaFactory.createForClass(Invoice);
exports.InvoiceSchema.index({ businessId: 1, contractId: 1 });
exports.InvoiceSchema.index({ businessId: 1, customerId: 1 });
exports.InvoiceSchema.index({ businessId: 1, groupId: 1 }, { unique: true });
exports.InvoiceSchema.index({ businessId: 1, contractId: 1, invoiceNumber: 1 }, { unique: true });
//# sourceMappingURL=invoice.schema.js.map