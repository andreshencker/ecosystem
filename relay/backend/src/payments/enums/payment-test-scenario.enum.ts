// src/payments/enums/payment-test-scenario.enum.ts

export enum PaymentTestScenario {
  Success = 'success',
  CardDeclined = 'card_declined',
  InsufficientFunds = 'insufficient_funds',
  AuthenticationRequired = 'authentication_required',
  ExpiredCard = 'expired_card',
  IncorrectCvc = 'incorrect_cvc',
  ProcessingError = 'processing_error',
}
