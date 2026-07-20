import { randomUUID } from 'crypto';
import { ValueObject } from './value-object.base';

interface UUIDProps {
  value: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UUID extends ValueObject<UUIDProps> {
  protected constructor(props: UUIDProps) {
    super(props);
  }

  static generate(): UUID {
    return new UUID({ value: randomUUID() });
  }

  static from(value: string): UUID {
    if (!UUID_REGEX.test(value)) throw new Error(`Invalid UUID: ${value}`);
    return new UUID({ value });
  }

  static isValid(value: string): boolean {
    return UUID_REGEX.test(value);
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
