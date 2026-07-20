export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly details: unknown;

  protected constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}
