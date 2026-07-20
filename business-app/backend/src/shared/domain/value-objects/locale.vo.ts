import { ValueObject } from './value-object.base';

interface LocaleProps {
  value: string;
}

export class Locale extends ValueObject<LocaleProps> {
  private constructor(props: LocaleProps) {
    super(props);
  }

  /** Accepts BCP-47 locale tags, e.g. en-AU, es-AR */
  static of(value: string): Locale {
    if (!value?.trim()) throw new Error('Locale value cannot be empty');
    return new Locale({ value: value.trim() });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
