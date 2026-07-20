import { ValueObject } from './value-object.base';

interface AddressProps {
  street: string;
  city: string;
  state: string | undefined;
  postalCode: string;
  country: string;
}

export class Address extends ValueObject<AddressProps> {
  private constructor(props: AddressProps) {
    super(props);
  }

  static of(props: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  }): Address {
    if (!props.street?.trim()) throw new Error('Address street is required');
    if (!props.city?.trim()) throw new Error('Address city is required');
    if (!props.postalCode?.trim())
      throw new Error('Address postalCode is required');
    if (!props.country?.trim()) throw new Error('Address country is required');
    return new Address({ ...props, state: props.state });
  }

  get street(): string {
    return this.props.street;
  }

  get city(): string {
    return this.props.city;
  }

  get state(): string | undefined {
    return this.props.state;
  }

  get postalCode(): string {
    return this.props.postalCode;
  }

  get country(): string {
    return this.props.country;
  }

  toString(): string {
    return [this.street, this.city, this.state, this.postalCode, this.country]
      .filter(Boolean)
      .join(', ');
  }
}
