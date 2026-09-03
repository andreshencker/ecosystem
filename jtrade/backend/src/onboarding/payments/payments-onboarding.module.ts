import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../../core/auth/auth.module';
import {
  ProviderPayment,
  ProviderPaymentSchema,
} from './schemas/provider-payment.schema';
import {
  PaymentMethodConfig,
  PaymentMethodConfigSchema,
} from './config/schemas/payment-method-config.schema';
import { RelayPaymentsClient } from './relay-payments.client';
import { PaymentsCatalogService } from './payments-catalog.service';
import { StripeOnboardingService } from './stripe/stripe-onboarding.service';
import { PaymentsOnboardingService } from './payments-onboarding.service';
import { PaymentsOnboardingController } from './payments-onboarding.controller';
import { PaymentsAdminService } from './config/payments-admin.service';
import { PaymentsAdminController } from './config/payments-admin.controller';

/**
 * `onboarding/payments/` — a provider's payment methods.
 *
 *   config/   → admin curates which methods jtrade offers + their settings
 *   stripe/   → the Stripe Connect flow (+ its admin settings)
 *   coingate/ → later, same contract
 */
@Module({
  imports: [
    HttpModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: ProviderPayment.name, schema: ProviderPaymentSchema },
      { name: PaymentMethodConfig.name, schema: PaymentMethodConfigSchema },
    ]),
  ],
  controllers: [PaymentsOnboardingController, PaymentsAdminController],
  providers: [
    RelayPaymentsClient,
    PaymentsCatalogService,
    StripeOnboardingService,
    PaymentsOnboardingService,
    PaymentsAdminService,
  ],
  exports: [PaymentsOnboardingService],
})
export class PaymentsOnboardingModule {}
