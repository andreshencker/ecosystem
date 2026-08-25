// src/payments/dto/update-payment-method.dto.ts

import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsBoolean()
  @IsNotEmpty()
  enabled!: boolean;
}
