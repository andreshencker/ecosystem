import { randomUUID } from 'crypto';
import { ValueObject } from './value-object.base';

interface TenantIdProps {
  value: string;
}

export class TenantId extends ValueObject<TenantIdProps> {
  private constructor(props: TenantIdProps) {
    super(props);
  }

  static generate(): TenantId {
    return new TenantId({ value: randomUUID() });
  }

  static from(value: string): TenantId {
    if (!value?.trim()) throw new Error('TenantId cannot be empty');
    return new TenantId({ value: value.trim() });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
