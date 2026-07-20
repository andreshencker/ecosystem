import { CorrelationId } from '../../domain/value-objects/correlation-id.vo';

export function createCorrelationId(value?: string): CorrelationId {
  return value ? CorrelationId.from(value) : CorrelationId.generate();
}
