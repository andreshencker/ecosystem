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
import type {
  ApprovedInvoiceListResult,
  InvoiceApprovalResult,
} from './dto/invoice-response.dto';
import { InvoiceReviewItem, InvoiceReviewItemDocument } from './schemas/invoice-review-item.schema';
import type { CreateInvoiceReviewItemDto } from './dto/create-invoice-review-item.dto';
import type { MarkInvoicePaidDto } from './dto/mark-invoice-paid.dto';
import type { VoidInvoiceDto } from './dto/void-invoice.dto';
import type { MarkInvoiceSentDto } from './dto/mark-invoice-sent.dto';
import {
  toApprovalResult,
  toApprovedInvoiceListItem,
} from './dto/invoice-response.dto';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
import { mapShiftInvoiceToPdf } from '../../integrations/business-intelligence/contracts/invoice/shift-invoice';

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
    @InjectModel(InvoiceReviewItem.name)
    private readonly reviewItemModel: Model<InvoiceReviewItemDocument>,
    private readonly bi: BusinessIntelligenceService,
    private readonly communications: CommunicationsClientService,
  ) {}

  async previewPdf(businessId: string, invoiceId: string) {
    if (!Types.ObjectId.isValid(invoiceId)) throw new NotFoundException('Invoice not found');
    const invoice = await this.invoiceModel
      .findOne({ _id: invoiceId, businessId })
      .select('invoiceNumber')
      .lean()
      .exec();
    if (!invoice) throw new NotFoundException('Invoice not found');

    const documentData = await this.bi.getShiftInvoiceDocument(businessId, invoiceId);
    return this.communications.generateDocument({
      type: 'business',
      businessId,
      canonicalKey: 'invoice.shift-invoice.pdf',
      filename: `invoice-${invoice.invoiceNumber}`,
      data: mapShiftInvoiceToPdf(documentData) as unknown as Record<string, unknown>,
    });
  }

  async addReviewItem(businessId: string, dto: CreateInvoiceReviewItemDto) {
    const item = await this.reviewItemModel.create({
      businessId,
      groupId: dto.groupId,
      date: dto.date.slice(0, 10),
      concept: dto.concept.trim(),
      amount: Number(dto.amount).toFixed(2),
    });
    return { id: String(item._id), groupId: item.groupId, date: item.date, concept: item.concept, amount: item.amount };
  }

  async removeReviewItem(businessId: string, itemId: string): Promise<void> {
    if (!Types.ObjectId.isValid(itemId)) throw new NotFoundException('Concept not found');
    const deleted = await this.reviewItemModel.findOneAndDelete({ _id: itemId, businessId }).exec();
    if (!deleted) throw new NotFoundException('Concept not found');
  }

  async markPaid(businessId: string, invoiceId: string, dto: MarkInvoicePaidDto) {
    if (!Types.ObjectId.isValid(invoiceId)) throw new NotFoundException('Invoice not found');
    const invoice = await this.invoiceModel.findOne({ _id: invoiceId, businessId }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'voided') throw new BadRequestException('A voided invoice cannot be paid');
    if (invoice.status === 'paid') return toApprovedInvoiceListItem(invoice.toObject());

    invoice.status = 'paid';
    invoice.amountPaid = invoice.total;
    invoice.balance = '0.00';
    invoice.paidAt = new Date(dto.paidAt);
    invoice.paymentReference = dto.reference?.trim() || null;
    invoice.paymentNotes = dto.notes?.trim() || null;
    await invoice.save();
    return toApprovedInvoiceListItem(invoice.toObject());
  }

  async markSent(businessId: string, invoiceId: string, dto: MarkInvoiceSentDto) {
    if (!Types.ObjectId.isValid(invoiceId)) throw new NotFoundException('Invoice not found');
    const invoice = await this.invoiceModel.findOne({ _id: invoiceId, businessId }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') throw new BadRequestException('A paid invoice cannot be marked as sent');
    if (invoice.status === 'voided') throw new BadRequestException('A voided invoice cannot be marked as sent');

    // Legacy invoices created before balance was persisted may receive the
    // schema default (0.00) when they are saved for the first time. An unpaid
    // invoice must retain its full outstanding balance when it is sent.
    if (
      Number(invoice.total) > 0 &&
      Number(invoice.amountPaid ?? 0) === 0 &&
      Number(invoice.balance ?? 0) === 0
    ) {
      invoice.balance = invoice.total;
    }
    invoice.status = 'sent';
    invoice.sentAt = new Date(dto.sentAt);
    await invoice.save();
    return toApprovedInvoiceListItem(invoice.toObject());
  }

  async recordReminder(businessId: string, invoiceId: string) {
    if (!Types.ObjectId.isValid(invoiceId)) throw new NotFoundException('Invoice not found');
    const invoice = await this.invoiceModel.findOne({ _id: invoiceId, businessId }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'sent') throw new BadRequestException('Only sent invoices can receive payment reminders');
    const today = new Date().toISOString().slice(0, 10);
    if (!invoice.dueDate || invoice.dueDate >= today || Number(invoice.balance) <= 0) {
      throw new BadRequestException('This invoice is not overdue');
    }

    invoice.lastReminderAt = new Date();
    invoice.reminderCount = Number(invoice.reminderCount ?? 0) + 1;
    await invoice.save();
    return toApprovedInvoiceListItem(invoice.toObject());
  }

  async voidInvoice(businessId: string, invoiceId: string, dto: VoidInvoiceDto) {
    if (!Types.ObjectId.isValid(invoiceId)) throw new NotFoundException('Invoice not found');
    const invoice = await this.invoiceModel.findOne({ _id: invoiceId, businessId }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') throw new BadRequestException('A paid invoice cannot be voided');
    if (invoice.status === 'voided') return toApprovedInvoiceListItem(invoice.toObject());

    invoice.status = 'voided';
    invoice.balance = '0.00';
    invoice.voidedAt = new Date();
    invoice.voidReason = dto.reason.trim();
    await invoice.save();
    return toApprovedInvoiceListItem(invoice.toObject());
  }

  async listApproved(businessId: string): Promise<ApprovedInvoiceListResult> {
    const docs = await this.invoiceModel
      .find({ businessId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const customerIds = [...new Set(docs.map((doc) => doc.customerId).filter(Boolean))];
    const contractIds = [...new Set(docs.map((doc) => doc.contractId).filter(Boolean))];
    const objectIds = (values: string[]) => values
      .filter((value) => Types.ObjectId.isValid(value))
      .map((value) => new Types.ObjectId(value));
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
    const customerById = new Map(customers.map((customer: any) => [String(customer._id), customer]));
    const contractById = new Map(contracts.map((contract: any) => [String(contract._id), contract]));

    return {
      items: docs.map((doc: any) => {
        const customer: any = customerById.get(doc.customerId);
        const contract: any = contractById.get(doc.contractId);
        const invoiceDate = doc.invoiceDate ?? new Date(doc.createdAt).toISOString().slice(0, 10);
        return toApprovedInvoiceListItem({
          ...doc,
          customerName: doc.customerName ?? customer?.displayName ?? null,
          invoiceDate,
          dueDate: doc.dueDate ?? this.calculateDueDate(invoiceDate, doc.periodEnd, contract),
        });
      }),
      total: docs.length,
    };
  }

  private calculateDueDate(invoiceDate: string, periodEnd: string, contract: any): string | null {
    if (!contract) return null;
    const base = new Date(`${invoiceDate}T00:00:00Z`);
    if (contract.scheduledPaymentEnabled && contract.scheduledPaymentDay) {
      const weekdays: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const target = weekdays[contract.scheduledPaymentDay];
      if (target === undefined) return null;
      let days = (target - base.getUTCDay() + 7) % 7;
      if (days === 0) days = 7;
      base.setUTCDate(base.getUTCDate() + days);
      return base.toISOString().slice(0, 10);
    }
    if (contract.paymentTermsDays != null) {
      if (contract.invoiceDueRule === 'end_of_week' && periodEnd) {
        base.setTime(new Date(`${periodEnd}T00:00:00Z`).getTime());
      } else if (contract.invoiceDueRule === 'end_of_month' && periodEnd) {
        const periodDate = new Date(`${periodEnd}T00:00:00Z`);
        base.setTime(Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth() + 1, 0));
      }
      base.setUTCDate(base.getUTCDate() + Number(contract.paymentTermsDays));
      return base.toISOString().slice(0, 10);
    }
    return null;
  }

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
    const { groupId } = dto;

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

    const customerId = group.customerId;
    const contractId = group.contractId;

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

      await this.reviewItemModel.deleteMany({ businessId, groupId }).session(session).exec();

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
      ? String(contract.invoicePrefix).trim()
      : '';

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

    return `${prefix}${nextSeq}`;
  }
}
