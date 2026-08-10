import { Model } from 'mongoose';
import { InvoiceDocument } from './schemas/invoice.schema';
import { ContractDocument } from '../contracts/schemas/contract.schema';
import { ShiftDocument } from '../shifts/schemas/shift.schema';
import { BusinessIntelligenceService } from '../../integrations/business-intelligence/business-intelligence.service';
import type { ApproveInvoiceDto } from './dto/approve-invoice.dto';
import type { ApprovedInvoiceListResult, InvoiceApprovalResult } from './dto/invoice-response.dto';
import { InvoiceReviewItemDocument } from './schemas/invoice-review-item.schema';
import type { CreateInvoiceReviewItemDto } from './dto/create-invoice-review-item.dto';
import type { MarkInvoicePaidDto } from './dto/mark-invoice-paid.dto';
import type { VoidInvoiceDto } from './dto/void-invoice.dto';
import type { MarkInvoiceSentDto } from './dto/mark-invoice-sent.dto';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
export declare class InvoicesService {
    private readonly invoiceModel;
    private readonly contractModel;
    private readonly shiftModel;
    private readonly reviewItemModel;
    private readonly bi;
    private readonly communications;
    private readonly logger;
    constructor(invoiceModel: Model<InvoiceDocument>, contractModel: Model<ContractDocument>, shiftModel: Model<ShiftDocument>, reviewItemModel: Model<InvoiceReviewItemDocument>, bi: BusinessIntelligenceService, communications: CommunicationsClientService);
    previewPdf(businessId: string, invoiceId: string): Promise<{
        buffer: Buffer;
        contentType: string;
        filename: string;
    }>;
    addReviewItem(businessId: string, dto: CreateInvoiceReviewItemDto): Promise<{
        id: string;
        groupId: string;
        date: string;
        concept: string;
        amount: string;
    }>;
    removeReviewItem(businessId: string, itemId: string): Promise<void>;
    markPaid(businessId: string, invoiceId: string, dto: MarkInvoicePaidDto): Promise<import("./dto/invoice-response.dto").ApprovedInvoiceListItem>;
    markSent(businessId: string, invoiceId: string, dto: MarkInvoiceSentDto): Promise<import("./dto/invoice-response.dto").ApprovedInvoiceListItem>;
    recordReminder(businessId: string, invoiceId: string): Promise<import("./dto/invoice-response.dto").ApprovedInvoiceListItem>;
    voidInvoice(businessId: string, invoiceId: string, dto: VoidInvoiceDto): Promise<import("./dto/invoice-response.dto").ApprovedInvoiceListItem>;
    listApproved(businessId: string): Promise<ApprovedInvoiceListResult>;
    private calculateDueDate;
    approve(businessId: string, dto: ApproveInvoiceDto): Promise<InvoiceApprovalResult>;
    private nextInvoiceNumber;
}
