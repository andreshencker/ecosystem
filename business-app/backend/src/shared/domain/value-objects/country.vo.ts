import { ValueObject } from './value-object.base';

interface CountryProps {
  code: string;
}

export class Country extends ValueObject<CountryProps> {
  private constructor(props: CountryProps) {
    super(props);
  }

  /** Accepts ISO 3166-1 alpha-2 codes, e.g. AU, US, GB */
  static of(code: string): Country {
    if (!code || code.trim().length !== 2) {
      throw new Error(
        `Invalid country code: ${code}. Must be a 2-letter ISO 3166-1 alpha-2 code.`,
      );
    }
    return new Country({ code: code.trim().toUpperCase() });
  }

  get code(): string {
    return this.props.code;
  }

  toString(): string {
    return this.props.code;
  }
}
