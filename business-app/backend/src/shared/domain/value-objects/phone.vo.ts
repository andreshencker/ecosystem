import { ValueObject } from './value-object.base';

interface PhoneProps {
  value: string;
  countryCode: string | undefined;
}

export class Phone extends ValueObject<PhoneProps> {
  private constructor(props: PhoneProps) {
    super(props);
  }

  static of(value: string, countryCode?: string): Phone {
    const normalized = value.replace(/\s+/g, '');
    if (!normalized) throw new Error('Phone value cannot be empty');
    return new Phone({ value: normalized, countryCode });
  }

  get value(): string {
    return this.props.value;
  }

  get countryCode(): string | undefined {
    return this.props.countryCode;
  }

  toString(): string {
    return this.props.value;
  }
}
