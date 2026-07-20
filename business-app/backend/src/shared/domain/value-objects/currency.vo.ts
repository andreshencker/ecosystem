import { ValueObject } from './value-object.base';

interface CurrencyProps {
  code: string;
}

export class Currency extends ValueObject<CurrencyProps> {
  private constructor(props: CurrencyProps) {
    super(props);
  }

  static of(code: string): Currency {
    if (!code || code.trim().length !== 3) {
      throw new Error(
        `Invalid currency code: ${code}. Must be a 3-letter ISO 4217 code.`,
      );
    }
    return new Currency({ code: code.trim().toUpperCase() });
  }

  get code(): string {
    return this.props.code;
  }

  toString(): string {
    return this.props.code;
  }
}
