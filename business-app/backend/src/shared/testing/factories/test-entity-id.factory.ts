import { EntityId } from '../../domain/value-objects/entity-id.vo';

export function createEntityId(value?: string): EntityId {
  return value ? EntityId.from(value) : EntityId.generate();
}
