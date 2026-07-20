import { ValueObject } from './value-object.base';

interface TimezoneProps {
  value: string;
}

export class Timezone extends ValueObject<TimezoneProps> {
  private constructor(props: TimezoneProps) {
    super(props);
  }

  /** Accepts IANA timezone identifiers, e.g. Australia/Sydney, America/New_York */
  static of(value: string): Timezone {
    if (!value?.trim()) throw new Error('Timezone value cannot be empty');
    return new Timezone({ value: value.trim() });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
