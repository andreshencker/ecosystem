// src/payments/dto/create-payment-test.dto.ts

import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { PaymentTestScenario } from '../enums/payment-test-scenario.enum';

export class CreatePaymentTestDto {
  @IsMongoId()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  paymentMethodKey!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsEnum(PaymentTestScenario)
  scenario!: PaymentTestScenario;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class GetTestScenariosQueryDto {
  @IsMongoId()
  connectionId!: string;

  @IsString()
  @IsNotEmpty()
  methodKey!: string;
}
