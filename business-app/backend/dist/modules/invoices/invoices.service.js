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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InvoicesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const invoice_schema_1 = require("./schemas/invoice.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const shift_schema_1 = require("../shifts/schemas/shift.schema");
const business_intelligence_service_1 = require("../../integrations/business-intelligence/business-intelligence.service");
const invoice_review_item_schema_1 = require("./schemas/invoice-review-item.schema");
const invoice_response_dto_1 = require("./dto/invoice-response.dto");
const communications_client_service_1 = require("../../integrations/communications/client/communications-client.service");
const shift_invoice_1 = require("../../integrations/business-intelligence/contracts/invoice/shift-invoice");
let InvoicesService = InvoicesService_1 = class InvoicesService {
    invoiceModel;
    contractModel;
    shiftModel;
    reviewItemModel;
    bi;
    communications;
    logger = new common_1.Logger(InvoicesService_1.name);
    constructor(invoiceModel, contractModel, shiftModel, reviewItemModel, bi, communications) {
        this.invoiceModel = invoiceModel;
        this.contractModel = contractModel;
        this.shiftModel = shiftModel;
        this.reviewItemModel = reviewItemModel;
        this.bi = bi;
        this.communications = communications;
    }
    async previewPdf(businessId, invoiceId) {
        if (!mongoose_2.Types.ObjectId.isValid(invoiceId))
            throw new common_1.NotFoundException('Invoice not found');
        const invoice = await this.invoiceModel
            .findOne({ _id: invoiceId, businessId })
            .select('invoiceNumber')
            .lean()
            .exec();
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        const documentData = await this.bi.getShiftInvoiceDocument(businessId, invoiceId);
        return this.communications.generateDocument({
            type: 'business',
            businessId,
            canonicalKey: 'invoice.shift-invoice.pdf',
            filename: `invoice-${invoice.invoiceNumber}`,
            data: (0, shift_invoice_1.mapShiftInvoiceToPdf)(documentData),
        });
    }
    async addReviewItem(businessId, dto) {
        const item = await this.reviewItemModel.create({
            businessId,
            groupId: dto.groupId,
            date: dto.date.slice(0, 10),
            concept: dto.concept.trim(),
            amount: Number(dto.amount).toFixed(2),
        });
        return { id: String(item._id), groupId: item.groupId, date: item.date, concept: item.concept, amount: item.amount };
    }
    async removeReviewItem(businessId, itemId) {
        if (!mongoose_2.Types.ObjectId.isValid(itemId))
            throw new common_1.NotFoundException('Concept not found');
        const deleted = await this.reviewItemModel.findOneAndDelete({ _id: itemId, businessId }).exec();
        if (!deleted)
            throw new common_1.NotFoundException('Concept not found');
    }
    async markPaid(businessId, invoiceId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(invoiceId))
            throw new common_1.NotFoundException('Invoice not found');
        const invoice = await this.invoiceModel.findOne({ _id: invoiceId, businessId }).exec();
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        if (invoice.status === 'voided')
            throw new common_1.BadRequestException('A voided invoice cannot be paid');
        if (invoice.status === 'paid')
            return (0, invoice_response_dto_1.toApprovedInvoiceListItem)(invoice.toObject());
        invoice.status = 'paid';
        invoice.amountPaid = invoice.total;
        invoice.balance = '0.00';
        invoice.paidAt = new Date(dto.paidAt);
        invoice.paymentReference = dto.reference?.trim() || null;
        invoice.paymentNotes = dto.notes?.trim() || null;
        await invoice.save();
        return (0, invoice_response_dto_1.toApprovedInvoiceListItem)(invoice.toObject());
    }
    async markSent(businessId, invoiceId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(invoiceId))
            throw new common_1.NotFoundException('Invoice not found');
        const invoice = await this.invoiceModel.findOne({ _id: invoiceId, businessId }).exec();
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        if (invoice.status === 'paid')
            throw new common_1.BadRequestException('A paid invoice cannot be marked as sent');
        if (invoice.status === 'voided')
            throw new common_1.BadRequestException('A voided invoice cannot be marked as sent');
        if (Number(invoice.total) > 0 &&
            Number(invoice.amountPaid ?? 0) === 0 &&
            Number(invoice.balance ?? 0) === 0) {
            invoice.balance = invoice.total;
        }
        invoice.status = 'sent';
        invoice.sentAt = new Date(dto.sentAt);
        await invoice.save();
        return (0, invoice_response_dto_1.toApprovedInvoiceListItem)(invoice.toObject());
    }
    async recordReminder(businessId, invoiceId) {
        if (!mongoose_2.Types.ObjectId.isValid(invoiceId))
            throw new common_1.NotFoundException('Invoice not found');
        const invoice = await this.invoiceModel.findOne({ _id: invoiceId, businessId }).exec();
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        if (invoice.status !== 'sent')
            throw new common_1.BadRequestException('Only sent invoices can receive payment reminders');
        const today = new Date().toISOString().slice(0, 10);
        if (!invoice.dueDate || invoice.dueDate >= today || Number(invoice.balance) <= 0) {
            throw new common_1.BadRequestException('This invoice is not overdue');
        }
        invoice.lastReminderAt = new Date();
        invoice.reminderCount = Number(invoice.reminderCount ?? 0) + 1;
        await invoice.save();
        return (0, invoice_response_dto_1.toApprovedInvoiceListItem)(invoice.toObject());
    }
    async voidInvoice(businessId, invoiceId, dto) {
        if (!mongoose_2.Types.ObjectId.isValid(invoiceId))
            throw new common_1.NotFoundException('Invoice not found');
        const invoice = await this.invoiceModel.findOne({ _id: invoiceId, businessId }).exec();
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        if (invoice.status === 'paid')
            throw new common_1.BadRequestException('A paid invoice cannot be voided');
        if (invoice.status === 'voided')
            return (0, invoice_response_dto_1.toApprovedInvoiceListItem)(invoice.toObject());
        invoice.status = 'voided';
        invoice.balance = '0.00';
        invoice.voidedAt = new Date();
        invoice.voidReason = dto.reason.trim();
        await invoice.save();
        return (0, invoice_response_dto_1.toApprovedInvoiceListItem)(invoice.toObject());
    }
    async listApproved(businessId) {
        const docs = await this.invoiceModel
            .find({ businessId })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        const customerIds = [...new Set(docs.map((doc) => doc.customerId).filter(Boolean))];
        const contractIds = [...new Set(docs.map((doc) => doc.contractId).filter(Boolean))];
        const objectIds = (values) => values
            .filter((value) => mongoose_2.Types.ObjectId.isValid(value))
            .map((value) => new mongoose_2.Types.ObjectId(value));
        const [customers, contracts] = await Promise.all([
            this.invoiceModel.db.collection('customers').find({
                companyId: businessId,
                _id: { $in: objectIds(customerIds) },
            }).toArray(),
            this.invoiceModel.db.collection('contracts').find({
                businessId,
                _id: { $in: objectIds(contractIds) },
            }).toArray(),
        ]);
        const customerById = new Map(customers.map((customer) => [String(customer._id), customer]));
        const contractById = new Map(contracts.map((contract) => [String(contract._id), contract]));
        return {
            items: docs.map((doc) => {
                const customer = customerById.get(doc.customerId);
                const contract = contractById.get(doc.contractId);
                const invoiceDate = doc.invoiceDate ?? new Date(doc.createdAt).toISOString().slice(0, 10);
                return (0, invoice_response_dto_1.toApprovedInvoiceListItem)({
                    ...doc,
                    customerName: doc.customerName ?? customer?.displayName ?? null,
                    invoiceDate,
                    dueDate: doc.dueDate ?? this.calculateDueDate(invoiceDate, doc.periodEnd, contract),
                });
            }),
            total: docs.length,
        };
    }
    calculateDueDate(invoiceDate, periodEnd, contract) {
        if (!contract)
            return null;
        const base = new Date(`${invoiceDate}T00:00:00Z`);
        if (contract.scheduledPaymentEnabled && contract.scheduledPaymentDay) {
            const weekdays = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
            const target = weekdays[contract.scheduledPaymentDay];
            if (target === undefined)
                return null;
            let days = (target - base.getUTCDay() + 7) % 7;
            if (days === 0)
                days = 7;
            base.setUTCDate(base.getUTCDate() + days);
            return base.toISOString().slice(0, 10);
        }
        if (contract.paymentTermsDays != null) {
            if (contract.invoiceDueRule === 'end_of_week' && periodEnd) {
                base.setTime(new Date(`${periodEnd}T00:00:00Z`).getTime());
            }
            else if (contract.invoiceDueRule === 'end_of_month' && periodEnd) {
                const periodDate = new Date(`${periodEnd}T00:00:00Z`);
                base.setTime(Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth() + 1, 0));
            }
            base.setUTCDate(base.getUTCDate() + Number(contract.paymentTermsDays));
            return base.toISOString().slice(0, 10);
        }
        return null;
    }
    async approve(businessId, dto) {
        const { groupId } = dto;
        const existing = await this.invoiceModel
            .findOne({ businessId, groupId })
            .lean()
            .exec();
        if (existing) {
            throw new common_1.ConflictException(`Invoice for group ${groupId} already exists: ${existing.invoiceNumber}`);
        }
        const biResult = await this.bi.getPendingInvoiceGroups(businessId);
        if (!biResult) {
            throw new common_1.BadRequestException('Business Intelligence service is unavailable — cannot approve invoice');
        }
        const group = biResult.groups.find((g) => g.groupId === groupId);
        if (!group) {
            throw new common_1.NotFoundException(`Pending invoice group ${groupId} not found. It may have already been approved or the calculation has changed.`);
        }
        if (!group.isApprovable) {
            throw new common_1.BadRequestException(`Invoice group is not approvable: ${group.errors.join('; ')}`);
        }
        const customerId = group.customerId;
        const contractId = group.contractId;
        const contract = await this.contractModel
            .findOne({ _id: contractId, businessId })
            .lean()
            .exec();
        if (!contract) {
            throw new common_1.NotFoundException('Contract not found');
        }
        const invoiceNumber = await this.nextInvoiceNumber(businessId, contract);
        const shiftIds = group.shiftDetails.map((s) => s.shiftId);
        const session = await this.invoiceModel.db.startSession();
        try {
            session.startTransaction();
            const [created] = await this.invoiceModel.create([
                {
                    businessId,
                    customerId,
                    contractId,
                    invoiceNumber,
                    customerName: group.customerName,
                    invoiceDate: new Date().toISOString().slice(0, 10),
                    dueDate: group.dueDate,
                    periodStart: group.periodStart,
                    periodEnd: group.periodEnd,
                    currency: group.currency,
                    shiftIds,
                    additionalConcepts: (group.additionalConcepts ?? []).map((item) => ({
                        date: item.date,
                        concept: item.concept,
                        amount: item.amount,
                    })),
                    subtotal: group.subtotal,
                    taxAmount: group.taxAmount,
                    total: group.total,
                    amountPaid: '0.00',
                    balance: group.total,
                    groupId,
                    status: 'approved',
                },
            ], { session });
            await this.shiftModel.updateMany({
                _id: { $in: shiftIds.map((id) => new mongoose_2.Types.ObjectId(id)) },
                businessId,
                invoiceStatus: 'pending',
            }, { $set: { invoiceStatus: 'invoiced' } }, { session });
            await this.reviewItemModel.deleteMany({ businessId, groupId }).session(session).exec();
            await session.commitTransaction();
            this.logger.log(`[Invoices] Approved group=${groupId} invoice=${invoiceNumber} shifts=${shiftIds.length} business=${businessId}`);
            return (0, invoice_response_dto_1.toApprovalResult)(created.toObject());
        }
        catch (err) {
            await session.abortTransaction();
            throw err;
        }
        finally {
            await session.endSession();
        }
    }
    async nextInvoiceNumber(businessId, contract) {
        const startingNumber = contract.startingInvoiceNumber ?? 1;
        const usePrefix = contract.useInvoicePrefix ?? false;
        const prefix = usePrefix && contract.invoicePrefix
            ? String(contract.invoicePrefix).trim()
            : '';
        const latest = await this.invoiceModel
            .findOne({ businessId, contractId: String(contract._id) })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        let nextSeq = startingNumber;
        if (latest?.invoiceNumber) {
            const match = latest.invoiceNumber.match(/(\d+)$/);
            if (match) {
                const lastSeq = parseInt(match[1], 10);
                if (!isNaN(lastSeq) && lastSeq >= nextSeq) {
                    nextSeq = lastSeq + 1;
                }
            }
        }
        return `${prefix}${nextSeq}`;
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = InvoicesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(invoice_schema_1.Invoice.name)),
    __param(1, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __param(2, (0, mongoose_1.InjectModel)(shift_schema_1.Shift.name)),
    __param(3, (0, mongoose_1.InjectModel)(invoice_review_item_schema_1.InvoiceReviewItem.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        business_intelligence_service_1.BusinessIntelligenceService,
        communications_client_service_1.CommunicationsClientService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map