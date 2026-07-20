import { randomUUID } from 'crypto';
import { ValueObject } from './value-object.base';

interface EntityIdProps {
  value: string;
}

export class EntityId extends ValueObject<EntityIdProps> {
  private constructor(props: EntityIdProps) {
    super(props);
  }

  static generate(): EntityId {
    return new EntityId({ value: randomUUID() });
  }

  static from(value: string): EntityId {
    if (!value?.trim()) throw new Error('EntityId cannot be empty');
    return new EntityId({ value: value.trim() });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
