import { ValueObject } from './value-object.base';

interface PercentageProps {
  value: number;
}

export class Percentage extends ValueObject<PercentageProps> {
  private constructor(props: PercentageProps) {
    super(props);
  }

  static of(value: number): Percentage {
    if (value < 0 || value > 100) {
      throw new Error(`Percentage must be between 0 and 100, got ${value}`);
    }
    return new Percentage({ value });
  }

  get value(): number {
    return this.props.value;
  }

  toDecimal(): number {
    return this.props.value / 100;
  }

  toString(): string {
    return `${this.props.value}%`;
  }
}
