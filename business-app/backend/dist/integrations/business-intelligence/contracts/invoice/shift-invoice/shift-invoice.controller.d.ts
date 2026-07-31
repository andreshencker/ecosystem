import type { AuthContext } from '../../../../../infrastructure/security/types/auth-context.types';
import { ShiftInvoiceService } from './shift-invoice.service';
export declare class ShiftInvoiceController {
    private readonly service;
    constructor(service: ShiftInvoiceService);
    generate(format: string, invoiceId: string, ctx: AuthContext): Promise<import("./shift-invoice.service").ShiftInvoiceContractResult>;
    private resolveBusinessId;
    private resolveFormat;
}
