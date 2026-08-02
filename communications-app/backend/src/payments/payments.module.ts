// src/payments/payments.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ─── Existing generic infrastructure (reused, not duplicated) ─────────────────
import {
  Provider,
  ProviderSchema,
} from '../communication/channels/providers/schemas/provider.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from '../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';
import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../communication/channels/provider-credentials/schemas/provider-credentials.schema';
import { ChannelsRuntimeModule } from '../communication/channels/runtime/channels-runtime.module';

// ─── Webhook technical schemas ─────────────────────────────────────────────────
import {
  WebhookDelivery,
  WebhookDeliverySchema,
} from './schemas/webhook-delivery.schema';
import {
  WebhookEndpointSecret,
  WebhookEndpointSecretSchema,
} from './schemas/webhook-endpoint-secret.schema';

// ─── Security (encryption for signing secrets) ────────────────────────────────
import { CryptoService } from '../communication/common/security/crypto.service';

// ─── Payments domain ──────────────────────────────────────────────────────────
import { PaymentsController } from './controllers/payments.controller';
import { PaymentsAccountsController } from './controllers/payments-accounts.controller';
import { PaymentsBalanceController } from './controllers/payments-balance.controller';
import { PaymentsPaymentMethodsController } from './controllers/payments-payment-methods.controller';
import { PaymentsTestingController } from './controllers/payments-testing.controller';
import { PaymentsListController } from './controllers/payments-list.controller';
import { PaymentsUnitsController } from './controllers/payments-units.controller';
import { PaymentsRefundsController } from './controllers/payments-refunds.controller';
import { PaymentsPayoutsController } from './controllers/payments-payouts.controller';
import { PaymentsWebhookEndpointsController } from './controllers/payments-webhook-endpoints.controller';
import { PaymentsWebhookDeliveriesController } from './controllers/payments-webhook-deliveries.controller';
import { PaymentsWebhookReceiverController } from './controllers/payments-webhook-receiver.controller';
import { PaymentsCoinGateCallbackController } from './controllers/payments-coingate-callback.controller';
import { PaymentsPageDefinitionController } from './controllers/payments-page-definition.controller';
import { PaymentsService } from './services/payments.service';
import { PaymentsResolverService } from './services/payments-resolver.service';
import { PaymentsAccountsService } from './services/payments-accounts.service';
import { PaymentsBalanceService } from './services/payments-balance.service';
import { PaymentsPaymentMethodsService } from './services/payments-payment-methods.service';
import { PaymentsTestingService } from './services/payments-testing.service';
import { PaymentsListService } from './services/payments-list.service';
import { PaymentsUnitsService } from './services/payments-units.service';
import { PaymentsRefundsService } from './services/payments-refunds.service';
import { PaymentsPayoutsService } from './services/payments-payouts.service';
import { PaymentsWebhookEndpointsService } from './services/payments-webhook-endpoints.service';
import { PaymentsWebhookDeliveriesService } from './services/payments-webhook-deliveries.service';
import { PaymentsPageDefinitionService } from './services/payments-page-definition.service';
import { PaymentProviderRegistry } from './registry/payment-provider.registry';

// ─── Provider adapters ────────────────────────────────────────────────────────
import { StripePaymentProvider } from './providers/stripe/stripe.provider';
import { CoingatePaymentProvider } from './providers/coingate/coingate.provider';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Existing models — reused, no new collections here.
      { name: Provider.name, schema: ProviderSchema },
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },

      // Webhook technical models.
      { name: WebhookDelivery.name, schema: WebhookDeliverySchema },
      { name: WebhookEndpointSecret.name, schema: WebhookEndpointSecretSchema },
    ]),

    ChannelsRuntimeModule,
  ],
  controllers: [
    PaymentsController,
    PaymentsAccountsController,
    PaymentsBalanceController,
    PaymentsPaymentMethodsController,
    PaymentsTestingController,
    PaymentsListController,
    PaymentsUnitsController,
    PaymentsRefundsController,
    PaymentsPayoutsController,
    PaymentsWebhookEndpointsController,
    PaymentsWebhookDeliveriesController,
    PaymentsWebhookReceiverController,
    PaymentsCoinGateCallbackController,
    PaymentsPageDefinitionController,
  ],
  providers: [
    // ── Provider adapters ──────────────────────────────────────────────────────
    StripePaymentProvider,
    CoingatePaymentProvider,

    // ── Registry ──────────────────────────────────────────────────────────────
    {
      provide: PaymentProviderRegistry,
      useFactory: (
        stripe: StripePaymentProvider,
        coingate: CoingatePaymentProvider,
      ): PaymentProviderRegistry =>
        new PaymentProviderRegistry([stripe, coingate]),
      inject: [StripePaymentProvider, CoingatePaymentProvider],
    },

    // ── Crypto (for webhook signing secret encryption) ─────────────────────────
    CryptoService,

    // ── Domain services ────────────────────────────────────────────────────────
    PaymentsService,
    PaymentsResolverService,
    PaymentsAccountsService,
    PaymentsBalanceService,
    PaymentsPaymentMethodsService,
    PaymentsTestingService,
    PaymentsListService,
    PaymentsUnitsService,
    PaymentsRefundsService,
    PaymentsPayoutsService,
    PaymentsWebhookEndpointsService,
    PaymentsWebhookDeliveriesService,
    PaymentsPageDefinitionService,
  ],
  exports: [PaymentsService, PaymentProviderRegistry],
})
export class PaymentsModule {}
