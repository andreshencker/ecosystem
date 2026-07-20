import { REGEX } from '../../kernel/regex';
import { ValueObject } from './value-object.base';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static of(value: string): Email {
    const normalized = value.trim().toLowerCase();
    if (!REGEX.EMAIL.test(normalized)) {
      throw new Error(`Invalid email address: ${value}`);
    }
    return new Email({ value: normalized });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
