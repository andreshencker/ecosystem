import { DomainError } from './domain-error.base';

export class BusinessError extends DomainError {
  readonly code: string;

  constructor(code: string, message: string, details?: unknown) {
    super(message, details);
    this.code = code;
  }
}
