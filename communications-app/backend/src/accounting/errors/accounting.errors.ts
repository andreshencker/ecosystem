// src/accounting/errors/accounting.errors.ts

/**
 * Domain-layer Accounting errors.
 *
 * These are plain Error subclasses — not NestJS HttpExceptions.
 * HTTP status mapping happens at the controller boundary.
 */

export class AccountingProviderNotFoundError extends Error {
  constructor(providerKey: string) {
    super(
      `Accounting provider not found: "${providerKey}". Check that it is registered in the AccountingModule.`,
    );
    this.name = 'AccountingProviderNotFoundError';
  }
}

export class DuplicateAccountingProviderRegistrationError extends Error {
  constructor(providerKey: string) {
    super(
      `Accounting provider "${providerKey}" is already registered. Each providerKey must be unique.`,
    );
    this.name = 'DuplicateAccountingProviderRegistrationError';
  }
}

export class AccountingProviderNotConfiguredError extends Error {
  constructor(providerKey: string) {
    super(
      `Accounting provider "${providerKey}" is not configured for this company. ` +
        `Enable the provider under Company → Enabled Providers and add credentials.`,
    );
    this.name = 'AccountingProviderNotConfiguredError';
  }
}

export class AccountingProviderCredentialsUnavailableError extends Error {
  constructor(providerKey: string) {
    super(
      `No active credentials found for accounting provider "${providerKey}". ` +
        `Add credentials under Company → Credentials.`,
    );
    this.name = 'AccountingProviderCredentialsUnavailableError';
  }
}

export class AccountingCapabilityNotSupportedError extends Error {
  constructor(providerKey: string, capability: string) {
    super(
      `Accounting provider "${providerKey}" does not support the "${capability}" capability.`,
    );
    this.name = 'AccountingCapabilityNotSupportedError';
  }
}

export class AccountingProviderConnectionFailedError extends Error {
  constructor(providerKey: string, reason?: string) {
    super(
      `Connection to accounting provider "${providerKey}" failed` +
        (reason ? `: ${reason}` : '.'),
    );
    this.name = 'AccountingProviderConnectionFailedError';
  }
}

export class AccountingCredentialChannelMismatchError extends Error {
  constructor(credentialId: string, expectedChannel: string) {
    super(
      `Credential "${credentialId}" does not belong to the "${expectedChannel}" channel. ` +
        'An accounting operation must use an accounting channel credential.',
    );
    this.name = 'AccountingCredentialChannelMismatchError';
  }
}

export class AccountingProviderUnavailableError extends Error {
  constructor(providerKey: string, reason?: string) {
    super(
      `Accounting provider "${providerKey}" is currently unavailable` +
        (reason ? `: ${reason}` : '.'),
    );
    this.name = 'AccountingProviderUnavailableError';
  }
}

export class AccountingResourceNotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`Accounting resource not found: ${resource} "${id}".`);
    this.name = 'AccountingResourceNotFoundError';
  }
}

export class AccountingDuplicateCodeError extends Error {
  constructor(code: string) {
    super(`Account code "${code}" is already in use. Choose a unique code.`);
    this.name = 'AccountingDuplicateCodeError';
  }
}

export class AccountingSystemAccountError extends Error {
  constructor(operation: string) {
    super(
      `This is a system-managed account and cannot be ${operation}. ` +
        'System accounts are maintained by the provider.',
    );
    this.name = 'AccountingSystemAccountError';
  }
}

export class AccountingAccountCannotBeDeletedError extends Error {
  constructor(reason?: string) {
    super(
      reason ??
        'This account cannot be deleted — it may have been used in transactions. ' +
          'Archive it instead.',
    );
    this.name = 'AccountingAccountCannotBeDeletedError';
  }
}

export class AccountingValidationError extends Error {
  constructor(detail: string) {
    super(`Account validation failed: ${detail}`);
    this.name = 'AccountingValidationError';
  }
}

/**
 * Thrown when a write operation is attempted but the current OAuth token
 * was issued without the required write scope (e.g. accounting.settings).
 *
 * This is distinct from token expiry (handled by the refresh mechanism).
 * Re-authorisation requires going through the full OAuth consent flow again
 * to obtain a token that includes the missing write scope.
 *
 * Callers: map to HTTP 401 so the client knows to reconnect.
 */
export class AccountingReauthorisationRequiredError extends Error {
  constructor(reason?: string) {
    super(
      'The Xero connection must be re-authorised to perform write operations. ' +
        (reason ??
          'The current OAuth token was issued with read-only scope (accounting.settings.read) ' +
            'and cannot create, update, archive or delete accounts. ' +
            'Reconnect via Provider Credentials to grant the required accounting.settings scope.'),
    );
    this.name = 'AccountingReauthorisationRequiredError';
  }
}
