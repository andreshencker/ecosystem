import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';

import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { Contract, ContractDocument } from '../contracts/schemas/contract.schema';
import { Shift, ShiftDocument } from '../shifts/schemas/shift.schema';
import { BusinessIntelligenceService } from '../../integrations/business-intelligence/business-intelligence.service';
import type { ApproveInvoiceDto } from './dto/approve-invoice.dto';
import type { InvoiceApprovalResult } from './dto/invoice-response.dto';
import { toApprovalResult } from './dto/invoice-response.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
    @InjectModel(Shift.name)
    private readonly shiftModel: Model<ShiftDocument>,
    private readonly bi: BusinessIntelligenceService,
  ) {}

  /**
   * Approve a pending invoice group.
   *
   * Flow:
   *  1. Re-fetch the BI calculation to get the current snapshot.
   *  2. Find the group matching groupId.
   *  3. Verify the group is approvable (no blocking errors).
   *  4. Assign an invoice number from the contract configuration.
   *  5. Persist the Invoice document.
   *  6. Mark all covered Shifts as invoiceStatus='invoiced'.
   *  7. Return the invoice summary.
   */
  async approve(
    businessId: string,
    dto: ApproveInvoiceDto,
  ): Promise<InvoiceApprovalResult> {
    const { groupId, customerId, contractId, periodStart, periodEnd } = dto;

    // ── Idempotency check ──────────────────────────────────────────────────────
    const existing = await this.invoiceModel
      .findOne({ businessId, groupId })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Invoice for group ${groupId} already exists: ${existing.invoiceNumber}`,
      );
    }

    // ── Re-fetch BI calculation ────────────────────────────────────────────────
    const biResult = await this.bi.getPendingInvoiceGroups(businessId);
    if (!biResult) {
      throw new BadRequestException(
        'Business Intelligence service is unavailable — cannot approve invoice',
      );
    }

    const group = biResult.groups.find((g) => g.groupId === groupId);
    if (!group) {
      throw new NotFoundException(
        `Pending invoice group ${groupId} not found. It may have already been approved or the calculation has changed.`,
      );
    }

    if (!group.isApprovable) {
      throw new BadRequestException(
        `Invoice group is not approvable: ${group.errors.join('; ')}`,
      );
    }

    // ── Fetch contract for invoice number rules ─────────────────────────────────
    const contract = await this.contractModel
      .findOne({ _id: contractId, businessId })
      .lean()
      .exec();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // ── Assign invoice number ──────────────────────────────────────────────────
    const invoiceNumber = await this.nextInvoiceNumber(businessId, contract);

    // ── Collect shift IDs from the group ──────────────────────────────────────
    const shiftIds = group.shiftDetails.map((s) => s.shiftId);

    // ── Persist in one session ─────────────────────────────────────────────────
    const session: ClientSession = await this.invoiceModel.db.startSession();
    try {
      session.startTransaction();

      const [created] = await this.invoiceModel.create(
        [
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
        ],
        { session },
      );

      await this.shiftModel.updateMany(
        {
          _id: { $in: shiftIds.map((id) => new Types.ObjectId(id)) },
          businessId,
          invoiceStatus: 'pending',
        },
        { $set: { invoiceStatus: 'invoiced' } },
        { session },
      );

      await session.commitTransaction();

      this.logger.log(
        `[Invoices] Approved group=${groupId} invoice=${invoiceNumber} shifts=${shiftIds.length} business=${businessId}`,
      );

      return toApprovalResult(created.toObject());
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  // ── Invoice number assignment ──────────────────────────────────────────────

  private async nextInvoiceNumber(
    businessId: string,
    contract: any,
  ): Promise<string> {
    const startingNumber: number = contract.startingInvoiceNumber ?? 1;
    const usePrefix = contract.useInvoicePrefix ?? false;
    const prefix = usePrefix && contract.invoicePrefix
      ? `${contract.invoicePrefix}-`
      : 'INV-';

    // Find the highest existing invoice number for this business + contract
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
}
