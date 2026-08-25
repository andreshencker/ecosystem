import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Contract,
  ContractDocument,
  VALID_RATE_DAYS,
} from './schemas/contract.schema';
import {
  Customer,
  CustomerDocument,
} from '../customer/schemas/customer.schema';
import { Shift } from '../shifts/schemas/shift.schema';
import {
  LinkedCalendar,
  LinkedCalendarDocument,
} from '../linked-calendars/schemas/linked-calendar.schema';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { RelayClientService } from '../../integrations/relay/client/relay-client.service';
import { UsersService } from '../users/users.service';

export interface ContractListParams {
  page: number;
  limit: number;
  customerId?: string;
  status?: string;
  search?: string;
}

export interface ActorContext {
  email: string;
  firstName: string;
  companyId: string;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectModel(Contract.name)
    private readonly model: Model<ContractDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(LinkedCalendar.name)
    private readonly calendarModel: Model<LinkedCalendarDocument>,
    @InjectModel(Shift.name)
    private readonly shiftModel: Model<any>,
    private readonly commClient: RelayClientService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Tenant validation ────────────────────────────────────────────────────

  /** Verify customer belongs to the business and return it. */
  private async assertCustomerOwnership(
    customerId: string,
    businessId: string,
  ): Promise<CustomerDocument> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customerId');
    }
    const customer = await this.customerModel
      .findOne({ _id: customerId, companyId: businessId })
      .lean()
      .exec();
    if (!customer) {
      throw new NotFoundException(
        'Customer not found or does not belong to this business',
      );
    }
    return customer;
  }

  // ─── Calendar validation ──────────────────────────────────────────────────

  /**
   * Validates that a linked-calendar reference is correct for a given flow.
   * `requireActive` should be true when a new or replacement calendar is being assigned.
   * Pass false only to allow retaining an existing inactive reference on update.
   */
  private async assertCalendarFlow(
    calendarId: string,
    businessId: string,
    expectedFlow: 'holidays' | 'payments',
    requireActive = true,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(calendarId)) {
      throw new BadRequestException(`Invalid ${expectedFlow} calendar ID`);
    }
    const cal = (await this.calendarModel
      .findOne({ _id: calendarId, companyId: businessId })
      .select('flow status')
      .lean()
      .exec()) as any;

    if (!cal) {
      throw new NotFoundException(
        `${expectedFlow} calendar not found or does not belong to this business`,
      );
    }
    if (cal.flow !== expectedFlow) {
      throw new BadRequestException(
        `Calendar is assigned to flow "${cal.flow ?? 'unassigned'}" — expected "${expectedFlow}"`,
      );
    }
    if (requireActive && cal.status !== 'active') {
      throw new BadRequestException(
        `The selected ${expectedFlow} calendar is inactive. Activate it or choose a different one.`,
      );
    }
  }

  // ─── Rate validation ──────────────────────────────────────────────────────

  private validateRates(
    rateType: string,
    rates: {
      days: string[];
      startTime?: string | null;
      endTime?: string | null;
      hourlyRate: number;
    }[],
  ): void {
    if (!rates || rates.length === 0) {
      throw new BadRequestException('rates must have at least one rule');
    }

    for (const rule of rates) {
      if (!rule.days || rule.days.length === 0) {
        throw new BadRequestException(
          'Each rate rule must specify at least one day',
        );
      }
      const invalidDays = rule.days.filter(
        (d) => !(VALID_RATE_DAYS as readonly string[]).includes(d),
      );
      if (invalidDays.length > 0) {
        throw new BadRequestException(
          `Invalid day values: ${invalidDays.join(', ')}. Valid: ${VALID_RATE_DAYS.join(', ')}`,
        );
      }
    }

    if (rateType === 'fixed') {
      if (rates.length !== 1) {
        throw new BadRequestException(
          'Fixed rateType must have exactly one rate rule',
        );
      }
      const rule = rates[0];
      if (rule.days.length !== 1 || rule.days[0] !== 'all') {
        throw new BadRequestException(
          'Fixed rate rule must have days: ["all"]',
        );
      }
      if (rule.startTime || rule.endTime) {
        throw new BadRequestException(
          'Fixed rate rule must have startTime and endTime as null',
        );
      }
    }

    if (rateType === 'variable') {
      for (const rule of rates) {
        if (rule.startTime || rule.endTime) {
          throw new BadRequestException(
            'variable rateType rules must not have startTime or endTime',
          );
        }
      }
    }

    if (rateType === 'variable_time_range') {
      const timePattern = /^\d{2}:\d{2}$/;
      for (const rule of rates) {
        if (!rule.startTime || !rule.endTime) {
          throw new BadRequestException(
            'variable_time_range rules require startTime and endTime',
          );
        }
        if (
          !timePattern.test(rule.startTime) ||
          !timePattern.test(rule.endTime)
        ) {
          throw new BadRequestException(
            'startTime and endTime must be in HH:mm format',
          );
        }
      }
    }
  }

  private validateDateRange(startDate: string, endDate?: string | null): void {
    if (!endDate) return;
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(
    businessId: string,
    dto: CreateContractDto,
    actor: ActorContext,
  ): Promise<ContractDocument> {
    await this.assertCustomerOwnership(dto.customerId, businessId);
    this.validateDateRange(dto.startDate, dto.endDate);
    this.validateRates(dto.rateType, dto.rates);

    // Validate holiday calendar flow
    if (dto.holidayRules?.enabled && dto.holidayRules.calendarId) {
      await this.assertCalendarFlow(
        dto.holidayRules.calendarId,
        businessId,
        'holidays',
        true,
      );
    }

    // Validate payment calendar flow
    if (dto.paymentCalendarEnabled) {
      if (!dto.paymentCalendarSubscriptionId) {
        throw new BadRequestException(
          'paymentCalendarSubscriptionId is required when paymentCalendarEnabled is true',
        );
      }
      await this.assertCalendarFlow(
        dto.paymentCalendarSubscriptionId,
        businessId,
        'payments',
        true,
      );
    }

    const doc = await this.model.create({
      businessId,
      customerId: dto.customerId,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      positionName: dto.positionName.trim(),
      workType: dto.workType ?? 'contractor',
      invoiceDescription: dto.invoiceDescription.trim(),
      status: 'active',
      billingCycle: dto.billingCycle,
      invoiceDueRule: dto.invoiceDueRule ?? 'from_invoice_date',
      // Mutual exclusion: exactly one payment method is active
      paymentTermsDays:
        (dto.scheduledPaymentEnabled ?? false)
          ? null
          : (dto.paymentTermsDays ?? null),
      scheduledPaymentEnabled: dto.scheduledPaymentEnabled ?? false,
      scheduledPaymentDay: ((dto.scheduledPaymentEnabled ?? false)
        ? (dto.scheduledPaymentDay ?? null)
        : null) as any,
      rateType: dto.rateType,
      minimumHours: dto.minimumHours ?? 4,
      defaultBreakMinutes: dto.defaultBreakMinutes ?? 30,
      rates: dto.rates,
      notes: dto.notes?.trim() ?? null,
      useInvoicePrefix: dto.useInvoicePrefix ?? false,
      invoicePrefix:
        dto.useInvoicePrefix && dto.invoicePrefix
          ? dto.invoicePrefix.trim()
          : null,
      startingInvoiceNumber: dto.startingInvoiceNumber ?? 1,
      currency: (dto.currency ?? 'AUD') as any,
      chargeGst: dto.chargeGst ?? false,
      gstRate: (dto.chargeGst ?? false) ? (dto.gstRate ?? null) : null,
      holidayRules: dto.holidayRules
        ? {
            enabled: dto.holidayRules.enabled ?? false,
            calendarId: dto.holidayRules.calendarId ?? null,
            calendarName: dto.holidayRules.calendarName ?? null,
            calendarProviderName: dto.holidayRules.calendarProviderName ?? null,
            behaviour: dto.holidayRules.behaviour ?? 'normal_rate',
            multiplier: dto.holidayRules.multiplier ?? null,
            fixedHourlyRate: dto.holidayRules.fixedHourlyRate ?? null,
          }
        : undefined,
      superannuationRules: dto.superannuationRules
        ? {
            enabled: dto.superannuationRules.enabled ?? false,
            rate: dto.superannuationRules.enabled
              ? (dto.superannuationRules.rate ?? null)
              : null,
            paymentFrequency: dto.superannuationRules.enabled
              ? (dto.superannuationRules.paymentFrequency ?? null)
              : null,
          }
        : undefined,
      paymentCalendarEnabled: dto.paymentCalendarEnabled ?? false,
      paymentCalendarSubscriptionId:
        (dto.paymentCalendarEnabled ?? false)
          ? (dto.paymentCalendarSubscriptionId ?? null)
          : null,
    });

    this._notify('contracts.contract_created', doc, actor).catch(() => void 0);
    return doc;
  }

  async findAll(
    businessId: string,
    params: ContractListParams,
  ): Promise<{
    items: ContractDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, customerId, status, search } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { businessId };
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (search?.trim()) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ positionName: re }, { invoiceDescription: re }];
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as any,
      this.model.countDocuments(filter),
    ]);

    // Batch-populate customer display names in one extra query (avoids N+1).
    const customerIds = [
      ...new Set(
        (items as any[]).map((c) => String(c.customerId)).filter(Boolean),
      ),
    ];
    const customers =
      customerIds.length > 0
        ? await this.customerModel
            .find({ _id: { $in: customerIds } })
            .select('_id displayName')
            .lean()
            .exec()
        : [];
    const customerNameMap = new Map(
      (customers as any[]).map((c) => [String(c._id), c.displayName ?? null]),
    );

    const itemsWithCustomer = (items as any[]).map((item) => ({
      ...item,
      customerName: customerNameMap.get(String(item.customerId)) ?? null,
    }));

    return { items: itemsWithCustomer, total, page, limit };
  }

  async findById(
    id: string,
    businessId: string,
  ): Promise<ContractDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findOne({ _id: id, businessId }).lean().exec();
  }

  async findByIdOrThrow(
    id: string,
    businessId: string,
  ): Promise<ContractDocument> {
    const doc = await this.findById(id, businessId);
    if (!doc) throw new NotFoundException('Contract not found');
    return doc;
  }

  async findByCustomer(
    customerId: string,
    businessId: string,
  ): Promise<ContractDocument[]> {
    return this.model
      .find({ customerId, businessId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async update(
    id: string,
    businessId: string,
    dto: UpdateContractDto,
    actor: ActorContext,
  ): Promise<ContractDocument> {
    const existing = await this.findByIdOrThrow(id, businessId);

    if (
      (existing as any).status === 'finished' ||
      (existing as any).status === 'cancelled'
    ) {
      throw new BadRequestException(
        `Cannot update a contract with status "${(existing as any).status}"`,
      );
    }

    if (dto.endDate || dto.startDate) {
      const startDate =
        dto.startDate ?? (existing as any).startDate?.toISOString();
      this.validateDateRange(startDate, dto.endDate);
    }

    const rateType = dto.rateType ?? (existing as any).rateType;
    if (dto.rates) {
      this.validateRates(rateType, dto.rates);
    } else if (dto.rateType && dto.rateType !== (existing as any).rateType) {
      this.validateRates(dto.rateType, (existing as any).rates);
    }

    // Validate holiday calendar flow when changing the calendar reference
    if (dto.holidayRules?.enabled && dto.holidayRules.calendarId) {
      const existingCalId = (existing as any).holidayRules?.calendarId ?? null;
      const isNewAssignment = dto.holidayRules.calendarId !== existingCalId;
      await this.assertCalendarFlow(
        dto.holidayRules.calendarId,
        businessId,
        'holidays',
        isNewAssignment,
      );
    }

    // Validate payment calendar flow
    if (dto.paymentCalendarEnabled) {
      if (!dto.paymentCalendarSubscriptionId) {
        throw new BadRequestException(
          'paymentCalendarSubscriptionId is required when paymentCalendarEnabled is true',
        );
      }
      const existingPayCalId =
        (existing as any).paymentCalendarSubscriptionId ?? null;
      const isNewAssignment =
        dto.paymentCalendarSubscriptionId !== existingPayCalId;
      await this.assertCalendarFlow(
        dto.paymentCalendarSubscriptionId,
        businessId,
        'payments',
        isNewAssignment,
      );
    }

    const $set: Record<string, any> = {};
    if (dto.startDate !== undefined) $set.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined)
      $set.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.positionName !== undefined)
      $set.positionName = dto.positionName.trim();
    if (dto.workType !== undefined) $set.workType = dto.workType;
    if (dto.invoiceDescription !== undefined)
      $set.invoiceDescription = dto.invoiceDescription.trim();
    if (dto.billingCycle !== undefined) $set.billingCycle = dto.billingCycle;
    if (dto.invoiceDueRule !== undefined)
      $set.invoiceDueRule = dto.invoiceDueRule;
    // Mutual exclusion enforced on every write
    if (dto.scheduledPaymentEnabled !== undefined) {
      $set.scheduledPaymentEnabled = dto.scheduledPaymentEnabled;
      $set.paymentTermsDays = dto.scheduledPaymentEnabled
        ? null
        : (dto.paymentTermsDays ?? null);
      $set.scheduledPaymentDay = dto.scheduledPaymentEnabled
        ? (dto.scheduledPaymentDay ?? null)
        : null;
    } else {
      if (dto.paymentTermsDays !== undefined)
        $set.paymentTermsDays = dto.paymentTermsDays;
      if (dto.scheduledPaymentDay !== undefined)
        $set.scheduledPaymentDay = dto.scheduledPaymentDay;
    }
    if (dto.rateType !== undefined) $set.rateType = dto.rateType;
    if (dto.minimumHours !== undefined) $set.minimumHours = dto.minimumHours;
    if (dto.defaultBreakMinutes !== undefined)
      $set.defaultBreakMinutes = dto.defaultBreakMinutes;
    if (dto.rates !== undefined) $set.rates = dto.rates;
    if (dto.notes !== undefined) $set.notes = dto.notes?.trim() ?? null;
    if (dto.useInvoicePrefix !== undefined)
      $set.useInvoicePrefix = dto.useInvoicePrefix;
    if (dto.invoicePrefix !== undefined)
      $set.invoicePrefix = dto.invoicePrefix?.trim() ?? null;
    if (dto.startingInvoiceNumber !== undefined)
      $set.startingInvoiceNumber = dto.startingInvoiceNumber;
    if (dto.currency !== undefined) $set.currency = dto.currency;
    if (dto.chargeGst !== undefined) $set.chargeGst = dto.chargeGst;
    if (dto.gstRate !== undefined)
      $set.gstRate = dto.chargeGst ? (dto.gstRate ?? null) : null;
    if (dto.holidayRules !== undefined) {
      $set.holidayRules = {
        enabled: dto.holidayRules.enabled ?? false,
        calendarId: dto.holidayRules.calendarId ?? null,
        calendarName: dto.holidayRules.calendarName ?? null,
        calendarProviderName: dto.holidayRules.calendarProviderName ?? null,
        behaviour: dto.holidayRules.behaviour ?? 'normal_rate',
        multiplier: dto.holidayRules.multiplier ?? null,
        fixedHourlyRate: dto.holidayRules.fixedHourlyRate ?? null,
      };
    }
    if (dto.superannuationRules !== undefined) {
      $set.superannuationRules = {
        enabled: dto.superannuationRules.enabled ?? false,
        rate: dto.superannuationRules.enabled
          ? (dto.superannuationRules.rate ?? null)
          : null,
        paymentFrequency: dto.superannuationRules.enabled
          ? (dto.superannuationRules.paymentFrequency ?? null)
          : null,
      };
    }
    if (dto.paymentCalendarEnabled !== undefined) {
      $set.paymentCalendarEnabled = dto.paymentCalendarEnabled;
      // Clear the reference when disabled; set it when enabled
      $set.paymentCalendarSubscriptionId = dto.paymentCalendarEnabled
        ? (dto.paymentCalendarSubscriptionId ?? null)
        : null;
    } else if (dto.paymentCalendarSubscriptionId !== undefined) {
      $set.paymentCalendarSubscriptionId = dto.paymentCalendarSubscriptionId;
    }

    const updated = await this.model
      .findOneAndUpdate({ _id: id, businessId }, { $set }, { new: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Contract not found');

    this._notify('contracts.contract_updated', updated, actor).catch(
      () => void 0,
    );
    return updated;
  }

  // ─── Status transitions ───────────────────────────────────────────────────

  async activate(
    id: string,
    businessId: string,
    actor: ActorContext,
  ): Promise<ContractDocument> {
    const doc = await this.findByIdOrThrow(id, businessId);
    const current = (doc as any).status as string;

    if (current !== 'draft' && current !== 'inactive') {
      throw new BadRequestException(
        `Cannot activate a contract with status "${current}". Only draft or inactive contracts can be activated.`,
      );
    }

    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, businessId },
        { $set: { status: 'active' } },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Contract not found');

    this._notify('contracts.contract_activated', updated, actor).catch(
      () => void 0,
    );
    return updated;
  }

  async cancel(
    id: string,
    businessId: string,
    actor: ActorContext,
  ): Promise<ContractDocument> {
    const doc = await this.findByIdOrThrow(id, businessId);
    const current = (doc as any).status as string;

    if (current === 'finished' || current === 'cancelled') {
      throw new BadRequestException(
        `Cannot cancel a contract with status "${current}"`,
      );
    }

    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, businessId },
        { $set: { status: 'cancelled' } },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Contract not found');

    this._notify('contracts.contract_cancelled', updated, actor).catch(
      () => void 0,
    );
    return updated;
  }

  async finish(
    id: string,
    businessId: string,
    actor: ActorContext,
  ): Promise<ContractDocument> {
    const doc = await this.findByIdOrThrow(id, businessId);
    const current = (doc as any).status as string;

    if (current !== 'active') {
      throw new BadRequestException(
        `Cannot finish a contract with status "${current}". Only active contracts can be finished.`,
      );
    }

    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, businessId },
        { $set: { status: 'finished' } },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Contract not found');

    this._notify('contracts.contract_finished', updated, actor).catch(
      () => void 0,
    );
    return updated;
  }

  async remove(id: string, businessId: string): Promise<void> {
    await this.findByIdOrThrow(id, businessId);

    // Block deletion when shifts reference this contract.
    const hasShifts = await this.shiftModel
      .exists({ contractId: id, businessId })
      .exec();

    if (hasShifts) {
      throw new BadRequestException(
        'This Contract cannot be deleted because it is already being used.',
      );
    }

    await this.model.findOneAndDelete({ _id: id, businessId }).exec();
  }

  // ─── Notifications (fire-and-forget) ─────────────────────────────────────

  private async _notify(
    eventKey: string,
    contract: any,
    actor: ActorContext,
  ): Promise<void> {
    if (!actor.email) {
      this.logger.warn(
        `[Contract notification] ${eventKey} SKIPPED — actor has no email address (contractId=${contract._id})`,
      );
      return;
    }

    try {
      const businessName = await this.usersService
        .getCompanyDisplayName(actor.companyId)
        .catch(() => '');

      const customer = (await this.customerModel
        .findById(contract.customerId)
        .select('displayName')
        .lean()
        .exec()) as any;

      const delivered = await this.commClient.notifyEvent({
        type: 'platform',
        event: eventKey,
        email: actor.email,
        data: {
          firstName: actor.firstName,
          businessName,
          customerName: customer?.displayName ?? '',
          positionName: contract.positionName,
          contractStatus: contract.status,
          actionDate: new Date().toISOString(),
          startDate: contract.startDate
            ? new Date(contract.startDate).toISOString()
            : null,
          endDate: contract.endDate
            ? new Date(contract.endDate).toISOString()
            : null,
        },
      });

      this.logger.log(
        `[Contract notification] ${eventKey} → ${actor.email} delivered=${delivered}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[Contract notification] ${eventKey} failed: ${err?.message}`,
      );
    }
  }
}
