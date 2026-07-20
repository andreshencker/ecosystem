import { DomainError } from './domain-error.base';

export class ValidationError extends DomainError {
  readonly code: string = 'VALIDATION_ERROR';
  readonly fields: Record<string, string[]>;

  constructor(
    message: string,
    fields?: Record<string, string[]>,
    details?: unknown,
  ) {
    super(message, details);
    this.fields = fields ?? {};
  }
}
