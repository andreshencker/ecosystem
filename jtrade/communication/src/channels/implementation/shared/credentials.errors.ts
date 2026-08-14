export class CredentialsContractError extends Error {
  constructor(
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'CredentialsContractError';
  }
}

export class CredentialsValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'CredentialsValidationError';
  }
}

export class CredentialsVerificationError extends Error {
  constructor(
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'CredentialsVerificationError';
  }
}

/**
 * Factory errors (routing)
 */
export class UnsupportedConnectionTypeError extends Error {
  constructor(channel: string, connectionType: string) {
    super(`Unsupported connectionType for ${channel}: "${connectionType}"`);
    this.name = 'UnsupportedConnectionTypeError';
  }
}

export class UnsupportedProviderKeyError extends Error {
  constructor(scope: string, providerKey: string) {
    super(`Unsupported providerKey for ${scope}: "${providerKey}"`);
    this.name = 'UnsupportedProviderKeyError';
  }
}
