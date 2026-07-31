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
const invoice_response_dto_1 = require("./dto/invoice-response.dto");
let InvoicesService = InvoicesService_1 = class InvoicesService {
    invoiceModel;
    contractModel;
    shiftModel;
    bi;
    logger = new common_1.Logger(InvoicesService_1.name);
    constructor(invoiceModel, contractModel, shiftModel, bi) {
        this.invoiceModel = invoiceModel;
        this.contractModel = contractModel;
        this.shiftModel = shiftModel;
        this.bi = bi;
    }
    async approve(businessId, dto) {
        const { groupId, customerId, contractId, periodStart, periodEnd } = dto;
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
                    periodStart: group.periodStart,
                    periodEnd: group.periodEnd,
                    currency: group.currency,
                    shiftIds,
                    subtotal: group.subtotal,
                    taxAmount: group.taxAmount,
                    total: group.total,
                    groupId,
                    status: 'approved',
                },
            ], { session });
            await this.shiftModel.updateMany({
                _id: { $in: shiftIds.map((id) => new mongoose_2.Types.ObjectId(id)) },
                businessId,
                invoiceStatus: 'pending',
            }, { $set: { invoiceStatus: 'invoiced' } }, { session });
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
            ? `${contract.invoicePrefix}-`
            : 'INV-';
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
        const padded = String(nextSeq).padStart(3, '0');
        return `${prefix}${padded}`;
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = InvoicesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(invoice_schema_1.Invoice.name)),
    __param(1, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __param(2, (0, mongoose_1.InjectModel)(shift_schema_1.Shift.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        business_intelligence_service_1.BusinessIntelligenceService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map