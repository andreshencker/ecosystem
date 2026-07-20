import { ValueObject } from './value-object.base';

interface LanguageProps {
  code: string;
}

export class Language extends ValueObject<LanguageProps> {
  private constructor(props: LanguageProps) {
    super(props);
  }

  /** Accepts ISO 639-1 alpha-2 codes, e.g. en, es, fr */
  static of(code: string): Language {
    if (!code || code.trim().length !== 2) {
      throw new Error(
        `Invalid language code: ${code}. Must be a 2-letter ISO 639-1 code.`,
      );
    }
    return new Language({ code: code.trim().toLowerCase() });
  }

  get code(): string {
    return this.props.code;
  }

  toString(): string {
    return this.props.code;
  }
}
