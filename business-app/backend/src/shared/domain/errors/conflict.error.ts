import { DomainError } from './domain-error.base';

export class ConflictError extends DomainError {
  readonly code: string = 'CONFLICT';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}
