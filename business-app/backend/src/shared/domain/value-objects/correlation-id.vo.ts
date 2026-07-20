import { randomUUID } from 'crypto';
import { ValueObject } from './value-object.base';

interface CorrelationIdProps {
  value: string;
}

export class CorrelationId extends ValueObject<CorrelationIdProps> {
  private constructor(props: CorrelationIdProps) {
    super(props);
  }

  static generate(): CorrelationId {
    return new CorrelationId({ value: randomUUID() });
  }

  static from(value: string): CorrelationId {
    if (!value?.trim()) throw new Error('CorrelationId cannot be empty');
    return new CorrelationId({ value: value.trim() });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
