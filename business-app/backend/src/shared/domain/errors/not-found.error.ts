import { DomainError } from './domain-error.base';

export class NotFoundError extends DomainError {
  readonly code: string = 'NOT_FOUND';

  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' was not found`);
  }
}
