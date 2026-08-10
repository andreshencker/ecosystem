// src/payments/dto/create-payment-test.dto.ts

import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUppercase,
  Length,
  Min,
} from 'class-validator';
import { PaymentTestScenario } from '../enums/payment-test-scenario.enum';

export class CreatePaymentTestDto {
  @IsMongoId()
  connectionId!: string;

  /**
   * Payment method key (e.g. 'card').
   * Required for Stripe, not needed for CoinGate.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  paymentMethodKey?: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  /**
   * ISO 4217 currency code (e.g. 'AUD', 'EUR') or provider asset code.
   * Used by Stripe (fiat currency) and as fallback.
   */
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  /**
   * Provider payment unit code — uppercase asset code (e.g. 'EUR', 'BTC').
   * Legacy field used by existing Stripe callers. Prefer priceCurrency for new callers.
   * Takes precedence over currency when both are supplied.
   */
  @IsOptional()
  @IsString()
  @IsUppercase()
  paymentUnitCode?: string;

  /**
   * The fiat currency the order amount is denominated in.
   * Maps to CoinGate POST /orders price_currency.
   * Must be a valid fiat code (e.g. 'EUR', 'USD', 'GBP').
   * Takes precedence over paymentUnitCode and currency for CoinGate.
   */
  @IsOptional()
  @IsString()
  @IsUppercase()
  priceCurrency?: string;

  /**
   * The crypto asset the merchant settles into.
   * Maps to CoinGate POST /orders receive_currency.
   * Optional — CoinGate uses the account default when absent.
   */
  @IsOptional()
  @IsString()
  @IsUppercase()
  receiveCurrency?: string;

  /**
   * Test scenario to simulate.
   * Required for Stripe, not used for CoinGate (sandbox always runs success flow).
   */
  @IsOptional()
  @IsEnum(PaymentTestScenario)
  scenario?: PaymentTestScenario;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  /**
   * Provider-specific extension fields.
   * Never used for credentials or secrets — only for provider-specific
   * parameters that do not map to canonical fields.
   */
  @IsOptional()
  @IsObject()
  providerExtensions?: Record<string, unknown>;
}

export class GetTestScenariosQueryDto {
  @IsMongoId()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  methodKey!: string;
}
