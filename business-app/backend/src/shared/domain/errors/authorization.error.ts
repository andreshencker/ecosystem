import { DomainError } from './domain-error.base';

export class AuthorizationError extends DomainError {
  readonly code: string = 'FORBIDDEN';

  constructor(message: string = 'Access denied', details?: unknown) {
    super(message, details);
  }
}
