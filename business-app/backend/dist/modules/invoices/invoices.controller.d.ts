import { InvoicesService } from './invoices.service';
import { ApproveInvoiceDto } from './dto/approve-invoice.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
export declare class InvoicesController {
    private readonly invoicesService;
    constructor(invoicesService: InvoicesService);
    private resolveContext;
    approve(ctx: AuthContext, dto: ApproveInvoiceDto): Promise<import("./dto/invoice-response.dto").InvoiceApprovalResult>;
}
