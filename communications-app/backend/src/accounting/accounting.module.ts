// src/accounting/accounting.module.ts
//
// Accounting channel module.
//
// Wires the Xero OAuth 2.0 connection lifecycle and the canonical accounting
// adapter layer. Future accounting providers (QuickBooks, MYOB, Sage, etc.)
// are added here independently without changing the generic module shape.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../communication/channels/provider-credentials/schemas/provider-credentials.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from '../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';
import { ChannelsRuntimeModule } from '../communication/channels/runtime/channels-runtime.module';

import { CryptoService } from '../communication/common/security/crypto.service';

import { XeroOAuthService } from './providers/xero/xero.oauth.service';
import { XeroConnectionService } from './providers/xero/xero.connection.service';
import { XeroOAuthController } from './providers/xero/xero.oauth.controller';
import { XeroAccountingProvider } from './providers/xero/xero-accounting.provider';
import { XeroOrganisationsService } from './providers/xero/xero-organisations.service';
import {
  XeroOrganisation,
  XeroOrganisationSchema,
} from './providers/xero/schemas/xero-organisation.schema';

import { AccountingProviderRegistry } from './registry/accounting-provider.registry';
import { AccountingService } from './services/accounting.service';
import { AccountingResolverService } from './services/accounting-resolver.service';
import { AccountingBankingService } from './services/accounting-banking.service';
import { AccountingBankTransactionsService } from './services/accounting-bank-transactions.service';
import { AccountingChartOfAccountsService } from './services/accounting-chart-of-accounts.service';
import { AccountingManualJournalsService } from './services/accounting-manual-journals.service';
import { AccountingGeneralLedgerService } from './services/accounting-general-ledger.service';
import { AccountingController } from './controllers/accounting.controller';
import { AccountingBankingController } from './controllers/accounting-banking.controller';
import { AccountingBankTransactionsController } from './controllers/accounting-bank-transactions.controller';
import { AccountingChartOfAccountsController } from './controllers/accounting-chart-of-accounts.controller';
import { AccountingManualJournalsController } from './controllers/accounting-manual-journals.controller';
import { AccountingGeneralLedgerController } from './controllers/accounting-general-ledger.controller';
import {
  BankConnection,
  BankConnectionSchema,
} from './bank-connections/schemas/bank-connection.schema';
import { BankConnectionsService } from './bank-connections/bank-connections.service';
import { BankConnectionsController } from './bank-connections/bank-connections.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
      { name: XeroOrganisation.name, schema: XeroOrganisationSchema },
      { name: BankConnection.name, schema: BankConnectionSchema },
    ]),
    ChannelsRuntimeModule,
  ],
  controllers: [
    XeroOAuthController,
    AccountingController,
    AccountingBankingController,
    AccountingBankTransactionsController,
    AccountingChartOfAccountsController,
    AccountingManualJournalsController,
    AccountingGeneralLedgerController,
    BankConnectionsController,
  ],
  providers: [
    // ── OAuth connection lifecycle ─────────────────────────────────────────────
    CryptoService,
    XeroOAuthService,
    XeroConnectionService,
    XeroOrganisationsService,

    // ── Provider adapters ──────────────────────────────────────────────────────
    XeroAccountingProvider,

    // ── Registry ──────────────────────────────────────────────────────────────
    {
      provide: AccountingProviderRegistry,
      useFactory: (xero: XeroAccountingProvider): AccountingProviderRegistry =>
        new AccountingProviderRegistry([xero]),
      inject: [XeroAccountingProvider],
    },

    // ── Accounting service (capabilities, catalogue) ──────────────────────────
    AccountingService,

    // ── Domain resolver ────────────────────────────────────────────────────────
    AccountingResolverService,

    // ── Banking capability ─────────────────────────────────────────────────────
    AccountingBankingService,

    // ── Bank Transactions capability ───────────────────────────────────────────
    AccountingBankTransactionsService,

    // ── Chart of Accounts capability ───────────────────────────────────────────
    AccountingChartOfAccountsService,

    // ── Manual Journals capability (external-app integration) ──────────────────
    AccountingManualJournalsService,

    // ── General Ledger capability (read-only journal view) ─────────────────────
    AccountingGeneralLedgerService,

    // ── Bank Connections (Open Banking) ────────────────────────────────────────
    BankConnectionsService,
  ],
  exports: [
    XeroOAuthService,
    XeroConnectionService,
    AccountingProviderRegistry,
    AccountingResolverService,
  ],
})
export class AccountingModule {}
