import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import { isConnectProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderContext } from '../types/payment.types';
import {
  ConnectedPaymentAccount,
  ConnectedPaymentAccountDocument,
} from '../schemas/connected-payment-account.schema';
import {
  ConnectPaymentExecution,
  ConnectPaymentExecutionDocument,
} from '../schemas/connect-payment-execution.schema';
import { PaymentsService } from './payments.service';
import type {
  CreateConnectCheckoutDto,
  CreateConnectedPaymentAccountDto,
} from '../dto/payment-connect.dto';
import type { VerifiedWebhookEvent } from '../contracts/payment-webhook-delivery.contract';
import type { ConnectedPaymentAccountState } from '../contracts/payment-connect.contract';

type ConnectedAccountRecord = ConnectedPaymentAccount & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

type ConnectExecutionRecord = ConnectPaymentExecution & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class PaymentsConnectService {
  constructor(
    @InjectModel(ConnectedPaymentAccount.name)
    private readonly accounts: Model<ConnectedPaymentAccountDocument>,
    @InjectModel(ConnectPaymentExecution.name)
    private readonly executions: Model<ConnectPaymentExecutionDocument>,
    private readonly payments: PaymentsService,
  ) {}

  private objectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value))
      throw new BadRequestException('Invalid identifier');
    return new Types.ObjectId(value);
  }

  private context(
    runtime: Awaited<ReturnType<PaymentsService['resolveRuntime']>>,
  ): PaymentProviderContext {
    return {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };
  }

  private environment(credentials: Record<string, unknown>): 'test' | 'live' {
    return credentials['mode'] === 'live' ? 'live' : 'test';
  }

  private accountResponse(account: ConnectedAccountRecord) {
    return {
      id: String(account._id),
      connectionId: String(account.platformConnectionId),
      connectedOrganizationId: account.connectedOrganizationId,
      providerKey: account.providerKey,
      providerAccountId: account.providerAccountId,
      environment: account.environment,
      status: account.status,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      detailsSubmitted: account.detailsSubmitted,
      country: account.country ?? null,
      defaultCurrency: account.defaultCurrency ?? null,
      requirementsCurrentlyDue: account.requirementsCurrentlyDue ?? [],
      requirementsEventuallyDue: account.requirementsEventuallyDue ?? [],
      disabledReason: account.disabledReason ?? null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private statePatch(state: ConnectedPaymentAccountState) {
    return {
      status: state.status,
      chargesEnabled: state.chargesEnabled,
      payoutsEnabled: state.payoutsEnabled,
      detailsSubmitted: state.detailsSubmitted,
      country: state.country ?? null,
      defaultCurrency: state.defaultCurrency ?? null,
      requirementsCurrentlyDue: state.requirementsCurrentlyDue ?? [],
      requirementsEventuallyDue: state.requirementsEventuallyDue ?? [],
      disabledReason: state.disabledReason ?? null,
    };
  }

  async createAccount(
    companyId: string,
    dto: CreateConnectedPaymentAccountDto,
  ) {
    const platformCompanyId = this.objectId(companyId);
    const connectionId = this.objectId(dto.connectionId);
    const existing = await this.accounts
      .findOne({
        platformCompanyId,
        platformConnectionId: connectionId,
        connectedOrganizationId: dto.connectedOrganizationId,
      })
      .lean();
    if (existing) return this.refreshAccount(companyId, String(existing._id));

    const runtime = await this.payments.resolveRuntime(
      companyId,
      dto.connectionId,
    );
    if (!isConnectProvider(runtime.provider))
      throw new UnprocessableEntityException(
        `${runtime.providerKey} does not support Connect`,
      );
    const state = await runtime.provider.createConnectedAccount(
      this.context(runtime),
      dto,
    );
    try {
      const created = await this.accounts.create({
        platformCompanyId,
        platformConnectionId: connectionId,
        connectedOrganizationId: dto.connectedOrganizationId,
        providerKey: runtime.providerKey,
        providerAccountId: state.providerAccountId,
        environment: this.environment(runtime.credentials),
        ...this.statePatch(state),
      });
      return this.accountResponse(created.toObject());
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      )
        throw new ConflictException('Connected account already exists');
      throw error;
    }
  }

  async listAccounts(companyId: string, connectionId: string) {
    await this.payments.resolveRuntime(companyId, connectionId);
    const rows = await this.accounts
      .find({
        platformCompanyId: this.objectId(companyId),
        platformConnectionId: this.objectId(connectionId),
      })
      .sort({ createdAt: -1 })
      .lean();
    return rows.map((row) => this.accountResponse(row));
  }

  async refreshAccount(companyId: string, accountId: string) {
    const account = await this.accounts
      .findOne({
        _id: this.objectId(accountId),
        platformCompanyId: this.objectId(companyId),
      })
      .lean();
    if (!account) throw new NotFoundException('Connected account not found');
    const runtime = await this.payments.resolveRuntime(
      companyId,
      String(account.platformConnectionId),
    );
    if (!isConnectProvider(runtime.provider))
      throw new UnprocessableEntityException(
        `${runtime.providerKey} does not support Connect`,
      );
    const state = await runtime.provider.getConnectedAccount(
      this.context(runtime),
      account.providerAccountId,
    );
    const updated = await this.accounts
      .findByIdAndUpdate(
        account._id,
        { $set: this.statePatch(state) },
        { new: true },
      )
      .lean();
    if (!updated) throw new NotFoundException('Connected account not found');
    return this.accountResponse(updated);
  }

  async createOnboarding(
    companyId: string,
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ) {
    const { account, runtime, provider } = await this.resolveAccount(
      companyId,
      accountId,
    );
    return provider.createConnectOnboarding(this.context(runtime), {
      providerAccountId: account.providerAccountId,
      refreshUrl,
      returnUrl,
    });
  }

  async createAccountSession(companyId: string, accountId: string) {
    const { account, runtime, provider } = await this.resolveAccount(
      companyId,
      accountId,
    );
    return provider.createConnectAccountSession(this.context(runtime), {
      providerAccountId: account.providerAccountId,
    });
  }

  private async resolveAccount(companyId: string, accountId: string) {
    const account = await this.accounts
      .findOne({
        _id: this.objectId(accountId),
        platformCompanyId: this.objectId(companyId),
      })
      .lean();
    if (!account) throw new NotFoundException('Connected account not found');
    const runtime = await this.payments.resolveRuntime(
      companyId,
      String(account.platformConnectionId),
    );
    if (!isConnectProvider(runtime.provider))
      throw new UnprocessableEntityException(
        `${runtime.providerKey} does not support Connect`,
      );
    return { account, runtime, provider: runtime.provider };
  }

  async createCheckout(companyId: string, dto: CreateConnectCheckoutDto) {
    if (dto.applicationFeeMinor > dto.amountMinor)
      throw new BadRequestException(
        'applicationFeeMinor cannot exceed amountMinor',
      );
    const platformCompanyId = this.objectId(companyId);
    const connectionId = this.objectId(dto.connectionId);
    const account = await this.accounts
      .findOne({
        platformCompanyId,
        platformConnectionId: connectionId,
        connectedOrganizationId: dto.connectedOrganizationId,
        chargesEnabled: true,
      })
      .lean();
    if (!account)
      throw new UnprocessableEntityException(
        'Connected account is not ready to accept payments',
      );
    const existing = await this.executions
      .findOne({
        platformConnectionId: connectionId,
        applicationKey: dto.applicationKey,
        externalReference: dto.externalReference,
      })
      .lean();
    if (existing) return this.executionResponse(existing);

    const runtime = await this.payments.resolveRuntime(
      companyId,
      dto.connectionId,
    );
    if (!isConnectProvider(runtime.provider))
      throw new UnprocessableEntityException(
        `${runtime.providerKey} does not support Connect`,
      );
    const idempotencyKey = createHash('sha256')
      .update(
        `${companyId}:${dto.connectionId}:${dto.applicationKey}:${dto.externalReference}`,
      )
      .digest('hex');
    const execution = await this.executions.create({
      platformCompanyId,
      platformConnectionId: connectionId,
      connectedAccountId: account._id,
      applicationKey: dto.applicationKey,
      externalReference: dto.externalReference,
      connectedOrganizationId: dto.connectedOrganizationId,
      amountMinor: dto.amountMinor,
      applicationFeeMinor: dto.applicationFeeMinor,
      currency: dto.currency.toUpperCase(),
      idempotencyKey,
      status: 'creating',
    });
    try {
      const result = await runtime.provider.createConnectCheckout(
        this.context(runtime),
        {
          providerAccountId: account.providerAccountId,
          externalReference: dto.externalReference,
          amountMinor: dto.amountMinor,
          applicationFeeMinor: dto.applicationFeeMinor,
          currency: dto.currency,
          successUrl: dto.successUrl,
          cancelUrl: dto.cancelUrl,
          description: dto.description,
          metadata: {
            ...dto.metadata,
            graphify_application_key: dto.applicationKey,
          },
          idempotencyKey,
        },
      );
      const updated = await this.executions
        .findByIdAndUpdate(
          execution._id,
          {
            $set: {
              providerSessionId: result.providerSessionId,
              providerPaymentId: result.providerPaymentId ?? null,
              redirectUrl: result.redirectUrl,
              status: result.status === 'complete' ? 'completed' : 'open',
              expiresAt: result.expiresAt,
            },
          },
          { new: true },
        )
        .lean();
      if (!updated) throw new NotFoundException('Payment execution not found');
      return this.executionResponse(updated);
    } catch (error) {
      await this.executions.updateOne(
        { _id: execution._id },
        { $set: { status: 'failed' } },
      );
      throw error;
    }
  }

  async getExecution(companyId: string, id: string) {
    const execution = await this.executions
      .findOne({
        _id: this.objectId(id),
        platformCompanyId: this.objectId(companyId),
      })
      .lean();
    if (!execution) throw new NotFoundException('Payment execution not found');
    return this.executionResponse(execution);
  }

  private executionResponse(execution: ConnectExecutionRecord) {
    return {
      id: String(execution._id),
      connectionId: String(execution.platformConnectionId),
      applicationKey: execution.applicationKey,
      externalReference: execution.externalReference,
      connectedOrganizationId: execution.connectedOrganizationId,
      amountMinor: execution.amountMinor,
      applicationFeeMinor: execution.applicationFeeMinor,
      currency: execution.currency,
      status: execution.status,
      providerSessionId: execution.providerSessionId ?? null,
      providerPaymentId: execution.providerPaymentId ?? null,
      redirectUrl: execution.redirectUrl ?? null,
      expiresAt: execution.expiresAt ?? null,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    };
  }

  async processVerifiedWebhook(
    connectionId: string,
    event: VerifiedWebhookEvent,
  ): Promise<void> {
    if (event.connectedAccountId && event.eventType === 'account.updated') {
      const state = event.safePayloadSummary ?? {};
      await this.accounts.updateOne(
        {
          platformConnectionId: this.objectId(connectionId),
          providerAccountId: event.connectedAccountId,
        },
        {
          $set: {
            chargesEnabled: state['charges_enabled'] === true,
            payoutsEnabled: state['payouts_enabled'] === true,
            detailsSubmitted: state['details_submitted'] === true,
            status:
              state['charges_enabled'] === true &&
              state['payouts_enabled'] === true
                ? 'enabled'
                : 'restricted',
            requirementsCurrentlyDue: state['requirements_currently_due'] ?? [],
            disabledReason: state['disabled_reason'] ?? null,
          },
        },
      );
    }
    const reference =
      event.safePayloadSummary?.['client_reference_id'] ??
      event.safePayloadSummary?.['metadata_external_reference'];
    if (typeof reference !== 'string') return;
    const status =
      event.eventType === 'checkout.session.completed' ||
      event.eventType === 'payment_intent.succeeded'
        ? 'completed'
        : event.eventType === 'checkout.session.expired'
          ? 'expired'
          : event.eventType === 'payment_intent.payment_failed'
            ? 'failed'
            : null;
    if (!status) return;
    await this.executions.updateOne(
      {
        platformConnectionId: this.objectId(connectionId),
        externalReference: reference,
      },
      {
        $set: {
          status,
          providerEventId: event.providerEventId,
          ...(status === 'completed' ? { completedAt: event.createdAt } : {}),
          ...(event.objectType === 'payment_intent'
            ? { providerPaymentId: event.objectId }
            : {}),
        },
      },
    );
  }
}
