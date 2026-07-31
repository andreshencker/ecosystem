// src/payments/services/payments-accounts.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';
import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../../communication/channels/provider-credentials/schemas/provider-credentials.schema';

import { PaymentCapability } from '../enums/payment.enums';
import type { PaymentAccount } from '../contracts/payment-account.contract';
import type { PaymentProviderContext } from '../types/payment.types';
import type {
  PaymentAccountVerificationResult,
  PaymentAccountSummary,
} from '../types/payment-account-verification.types';
import { isAccountProvider } from '../interfaces/payment-provider.interface';
import { PaymentCapabilityNotSupportedError } from '../errors/payment.errors';
import { PaymentsService } from './payments.service';
import { ListPaymentAccountsQueryDto } from '../dto/list-payment-accounts.dto';

// ─── Typed lean document shapes ──────────────────────────────────────────────

type LeanCredDoc = {
  _id: Types.ObjectId;
  tag: string;
  isActive?: boolean;
  displayIdentifier?: string;
  /** Canonical execution mode — stored directly, never derived. */
  mode?: string | null;
  createdAt?: Date;
  companyChannelProviderId: Types.ObjectId;
};

type LeanChannelRef = { channelKey: string } | null;
type LeanProviderRef = { providerKey: string; connectionType: string } | null;
type LeanCCPPopulated = {
  _id: Types.ObjectId;
  channelId: LeanChannelRef;
  providerId: LeanProviderRef;
};

@Injectable()
export class PaymentsAccountsService {
  private readonly logger = new Logger(PaymentsAccountsService.name);

  constructor(
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    @InjectModel(ProviderCredentials.name)
    private readonly credModel: Model<ProviderCredentialsDocument>,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Lists payment account summaries for the company from local DB.
   * No provider API calls — summary data only.
   */
  async listAccounts(
    companyId: string,
    query: ListPaymentAccountsQueryDto,
  ): Promise<{
    data: PaymentAccountSummary[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const companyObjId = new Types.ObjectId(companyId);
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    // Fetch all CCPs for this company, populating channel and provider info.
    // Filter to the payment channel in JS to avoid needing the Channel model injected.
    const allCcps = (await this.ccpModel
      .find({ companyId: companyObjId })
      .populate({ path: 'channelId', select: 'channelKey' })
      .populate({ path: 'providerId', select: 'providerKey connectionType' })
      .lean()
      .exec()) as unknown as LeanCCPPopulated[];

    const paymentCcps = allCcps.filter(
      (ccp) => ccp.channelId?.channelKey === 'payment',
    );

    if (paymentCcps.length === 0) {
      return { data: [], total: 0, limit, offset };
    }

    const ccpProviderMap = new Map<
      string,
      { providerKey: string; connectionType: string }
    >();
    for (const ccp of paymentCcps) {
      if (ccp.providerId?.providerKey) {
        ccpProviderMap.set(String(ccp._id), {
          providerKey: ccp.providerId.providerKey,
          connectionType: ccp.providerId.connectionType,
        });
      }
    }

    const paymentCcpIds = paymentCcps.map((ccp) => ccp._id);
    const credFilter: Record<string, unknown> = {
      companyChannelProviderId: { $in: paymentCcpIds },
    };
    if (query.isActive !== undefined) {
      credFilter['isActive'] = query.isActive;
    }

    const [credDocs, total] = await Promise.all([
      this.credModel
        .find(credFilter)
        .select(
          'tag isActive displayIdentifier mode createdAt companyChannelProviderId',
        )
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec() as Promise<LeanCredDoc[]>,
      this.credModel.countDocuments(credFilter),
    ]);

    const data: PaymentAccountSummary[] = credDocs.map((cred) => {
      const ccpId = String(cred.companyChannelProviderId);
      const providerInfo = ccpProviderMap.get(ccpId);

      // Read mode directly from the stored field — never derived.
      // Credentials saved before this field was introduced will have null here
      // until they are re-saved through the Credentials page.
      const environment: 'test' | 'live' | null =
        cred.mode === 'test' ? 'test' : cred.mode === 'live' ? 'live' : null;

      return {
        id: String(cred._id),
        providerKey: providerInfo?.providerKey ?? '',
        connectionType: providerInfo?.connectionType ?? '',
        tag: cred.tag,
        displayIdentifier: cred.displayIdentifier,
        isActive: cred.isActive !== false,
        connectedAt: cred.createdAt ?? null,
        environment,
      };
    });

    return { data, total, limit, offset };
  }

  /**
   * Retrieves the live account state from the provider.
   * Makes one provider API call.
   */
  async getAccount(
    companyId: string,
    accountId: string,
  ): Promise<PaymentAccount> {
    this.logger.debug(
      `[getAccount] companyId=${companyId} accountId=${accountId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isAccountProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        PaymentCapability.Account,
      );
    }

    // After the guard, runtime.provider is IPaymentAccountProvider.
    this.paymentsService.assertCapability(
      runtime.provider,
      PaymentCapability.Account,
    );

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    const account = await runtime.provider.getAccount(context);

    // Enrich connectedAt from ProviderCredentials.createdAt — the provider does not know this.
    const credDoc = (await this.credModel
      .findById(new Types.ObjectId(accountId))
      .select('createdAt')
      .lean()
      .exec()) as { createdAt?: Date } | null;

    return {
      ...account,
      connectedAt: credDoc?.createdAt ?? null,
    };
  }

  /**
   * Verifies the stored credentials and connection are currently valid.
   * Makes one provider API call.
   */
  async verifyAccount(
    companyId: string,
    accountId: string,
  ): Promise<PaymentAccountVerificationResult> {
    this.logger.debug(
      `[verifyAccount] companyId=${companyId} accountId=${accountId}`,
    );

    const runtime = await this.paymentsService.resolveRuntime(
      companyId,
      accountId,
    );

    if (!isAccountProvider(runtime.provider)) {
      throw new PaymentCapabilityNotSupportedError(
        runtime.providerKey,
        PaymentCapability.Account,
      );
    }

    this.paymentsService.assertCapability(
      runtime.provider,
      PaymentCapability.Account,
    );

    const context: PaymentProviderContext = {
      providerKey: runtime.providerKey,
      connectionType: runtime.provider.getMetadata().connectionType,
      credentialsId: runtime.accountId,
      isActive: true,
      credentials: runtime.credentials,
    };

    return runtime.provider.verifyConnection(context);
  }
}
