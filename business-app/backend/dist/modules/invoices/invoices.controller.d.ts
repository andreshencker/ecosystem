import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { ApproveInvoiceDto } from './dto/approve-invoice.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { CreateInvoiceReviewItemDto } from './dto/create-invoice-review-item.dto';
import { MarkInvoicePaidDto } from './dto/mark-invoice-paid.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { MarkInvoiceSentDto } from './dto/mark-invoice-sent.dto';
export declare class InvoicesController {
    private readonly invoicesService;
    constructor(invoicesService: InvoicesService);
    private resolveContext;
    listApproved(ctx: AuthContext): Promise<import("./dto/invoice-response.dto").ApprovedInvoiceListResult>;
    previewPdf(ctx: AuthContext, invoiceId: string, response: Response): Promise<Response<any, Record<string, any>>>;
    addReviewItem(ctx: AuthContext, dto: CreateInvoiceReviewItemDto): Promise<{
        id: string;
        groupId: string;
        date: string;
        concept: string;
        amount: string;
    }>;
    removeReviewItem(ctx: AuthContext, itemId: string): Promise<void>;
    markPaid(ctx: AuthContext, invoiceId: string, dto: MarkInvoicePaidDto): Promise<import("./dto/invoice-response.dto").ApprovedInvoiceListItem>;
    markSent(ctx: AuthContext, invoiceId: string, dto: MarkInvoiceSentDto): Promise<import("./dto/invoice-response.dto").ApprovedInvoiceListItem>;
    recordReminder(ctx: AuthContext, invoiceId: string): Promise<import("./dto/invoice-response.dto").ApprovedInvoiceListItem>;
    voidInvoice(ctx: AuthContext, invoiceId: string, dto: VoidInvoiceDto): Promise<import("./dto/invoice-response.dto").ApprovedInvoiceListItem>;
    approve(ctx: AuthContext, dto: ApproveInvoiceDto): Promise<import("./dto/invoice-response.dto").InvoiceApprovalResult>;
}
