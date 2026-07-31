import { Model } from 'mongoose';
import { InvoiceDocument } from './schemas/invoice.schema';
import { ContractDocument } from '../contracts/schemas/contract.schema';
import { ShiftDocument } from '../shifts/schemas/shift.schema';
import { BusinessIntelligenceService } from '../../integrations/business-intelligence/business-intelligence.service';
import type { ApproveInvoiceDto } from './dto/approve-invoice.dto';
import type { InvoiceApprovalResult } from './dto/invoice-response.dto';
export declare class InvoicesService {
    private readonly invoiceModel;
    private readonly contractModel;
    private readonly shiftModel;
    private readonly bi;
    private readonly logger;
    constructor(invoiceModel: Model<InvoiceDocument>, contractModel: Model<ContractDocument>, shiftModel: Model<ShiftDocument>, bi: BusinessIntelligenceService);
    approve(businessId: string, dto: ApproveInvoiceDto): Promise<InvoiceApprovalResult>;
    private nextInvoiceNumber;
}
