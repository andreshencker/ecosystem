import { Module } from '@nestjs/common';
import { PaymentsOnboardingModule } from './payments/payments-onboarding.module';

/**
 * Umbrella for jtrade's onboarding processes. Each sub-area is self-contained
 * and produces a result; something else combines those results to decide what
 * a provider is allowed to do.
 *
 *   payments/   → a provider's payment methods            (implemented)
 *   providers/  → becoming a provider                     (pending)
 *   product/    → getting a product ready to sell         (pending)
 */
@Module({
  imports: [PaymentsOnboardingModule],
  exports: [PaymentsOnboardingModule],
})
export class OnboardingModule {}
