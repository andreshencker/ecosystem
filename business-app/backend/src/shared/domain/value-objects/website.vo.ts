import { ValueObject } from './value-object.base';

interface WebsiteProps {
  value: string;
}

export class Website extends ValueObject<WebsiteProps> {
  private constructor(props: WebsiteProps) {
    super(props);
  }

  static of(value: string): Website {
    try {
      new URL(value);
    } catch {
      throw new Error(`Invalid URL: ${value}`);
    }
    return new Website({ value });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
