// src/payments/errors/payment.exception.ts

import { HttpException, HttpStatus } from '@nestjs/common';

import type { PaymentErrorCode } from './payment-error-codes';

/**
 * PaymentException — canonical NestJS HttpException for the Payments domain.
 *
 * Carries a stable machine-readable `errorCode` from `PaymentErrorCode` in
 * addition to the human-readable message and HTTP status code.
 *
 * Usage:
 *   throw new PaymentException(
 *     PaymentErrorCode.PAYMENT_PROVIDER_NOT_FOUND,
 *     `Payment provider "paypal" is not registered.`,
 *     HttpStatus.NOT_FOUND,
 *   );
 *
 * The response body follows the standard NestJS error shape:
 *   { statusCode, message, errorCode }
 *
 * Security rules:
 *   - Never include decrypted credential values in the message.
 *   - Never expose raw provider SDK errors in the message.
 */
export class PaymentException extends HttpException {
  constructor(
    public readonly errorCode: PaymentErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super({ statusCode: status, message, errorCode }, status);
    this.name = 'PaymentException';
  }
}
