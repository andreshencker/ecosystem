// src/payments/errors/payment.errors.ts

/**
 * Domain-layer Payments errors.
 *
 * These are plain Error subclasses — not NestJS HttpExceptions.
 * HTTP status mapping happens at the controller boundary.
 */

export class PaymentProviderNotFoundError extends Error {
  constructor(providerKey: string) {
    super(
      `Payment provider not found: "${providerKey}". Check that it is registered in the PaymentsModule.`,
    );
    this.name = 'PaymentProviderNotFoundError';
  }
}

export class DuplicateProviderRegistrationError extends Error {
  constructor(providerKey: string) {
    super(
      `Payment provider "${providerKey}" is already registered. Each providerKey must be unique.`,
    );
    this.name = 'DuplicateProviderRegistrationError';
  }
}

export class PaymentProviderNotConfiguredError extends Error {
  constructor(providerKey: string) {
    super(
      `Payment provider "${providerKey}" is not configured for this company. ` +
        `Enable the provider under Company → Enabled Providers and add credentials.`,
    );
    this.name = 'PaymentProviderNotConfiguredError';
  }
}

export class PaymentProviderCredentialsUnavailableError extends Error {
  constructor(providerKey: string) {
    super(
      `No active credentials found for payment provider "${providerKey}". ` +
        `Add credentials under Company → Credentials.`,
    );
    this.name = 'PaymentProviderCredentialsUnavailableError';
  }
}

export class PaymentCapabilityNotSupportedError extends Error {
  constructor(providerKey: string, capability: string) {
    super(
      `Payment provider "${providerKey}" does not support the "${capability}" capability.`,
    );
    this.name = 'PaymentCapabilityNotSupportedError';
  }
}

export class PaymentProviderConnectionFailedError extends Error {
  constructor(providerKey: string, reason?: string) {
    super(
      `Connection to payment provider "${providerKey}" failed` +
        (reason ? `: ${reason}` : '.'),
    );
    this.name = 'PaymentProviderConnectionFailedError';
  }
}

export class PaymentConnectionTestUnsupportedError extends Error {
  constructor(providerKey: string) {
    super(
      `Payment provider "${providerKey}" does not support live connection testing yet. ` +
        'Credentials were validated for format when saved.',
    );
    this.name = 'PaymentConnectionTestUnsupportedError';
  }
}

export class PaymentCredentialChannelMismatchError extends Error {
  constructor(credentialId: string, expectedChannel: string) {
    super(
      `Credential "${credentialId}" does not belong to the "${expectedChannel}" channel. ` +
        'A payment test-connection must use a payment channel credential.',
    );
    this.name = 'PaymentCredentialChannelMismatchError';
  }
}

export class PaymentCredentialsInvalidError extends Error {
  constructor(message?: string) {
    super(message ?? 'Payment credentials are invalid or have been revoked.');
    this.name = 'PaymentCredentialsInvalidError';
  }
}

export class PaymentProviderUnavailableError extends Error {
  constructor(providerKey: string, reason?: string) {
    super(
      `Payment provider "${providerKey}" is currently unavailable` +
        (reason ? `: ${reason}` : '.'),
    );
    this.name = 'PaymentProviderUnavailableError';
  }
}

export class PaymentConfigurationInvalidError extends Error {
  constructor(reason?: string) {
    super(
      'Payment provider configuration is invalid' +
        (reason ? `: ${reason}` : '.'),
    );
    this.name = 'PaymentConfigurationInvalidError';
  }
}

export class PaymentMethodNotFoundError extends Error {
  constructor(methodId: string) {
    super(
      `Payment method "${methodId}" not found in the provider configuration.`,
    );
    this.name = 'PaymentMethodNotFoundError';
  }
}

export class PaymentMethodNotConfigurableError extends Error {
  constructor(methodId: string, reason?: string) {
    super(
      `Payment method "${methodId}" cannot be configured` +
        (reason ? `: ${reason}` : '.'),
    );
    this.name = 'PaymentMethodNotConfigurableError';
  }
}
