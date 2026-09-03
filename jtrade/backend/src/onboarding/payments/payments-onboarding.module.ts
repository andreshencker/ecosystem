import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../../core/auth/auth.module';
import {
  ProviderPayment,
  ProviderPaymentSchema,
} from './schemas/provider-payment.schema';
import { RelayPaymentsClient } from './relay-payments.client';
import { PaymentsCatalogService } from './payments-catalog.service';
import { StripeOnboardingService } from './stripe/stripe-onboarding.service';
import { PaymentsOnboardingService } from './payments-onboarding.service';
import { PaymentsOnboardingController } from './payments-onboarding.controller';

/**
 * `onboarding/payments/` — a provider's payment methods.
 *
 * Each method's flow lives in its own folder (`stripe/`, later `coingate/`…)
 * and implements the same contract. This module only wires them together and
 * exposes the provider-facing endpoints.
 */
@Module({
  imports: [
    HttpModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: ProviderPayment.name, schema: ProviderPaymentSchema },
    ]),
  ],
  controllers: [PaymentsOnboardingController],
  providers: [
    RelayPaymentsClient,
    PaymentsCatalogService,
    StripeOnboardingService,
    PaymentsOnboardingService,
  ],
  exports: [PaymentsOnboardingService],
})
export class PaymentsOnboardingModule {}
