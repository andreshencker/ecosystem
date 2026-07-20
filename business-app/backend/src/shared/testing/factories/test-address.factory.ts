import { Address } from '../../domain/value-objects/address.vo';

export function createAddress(
  overrides?: Partial<{
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>,
): Address {
  return Address.of({
    street: '123 Test Street',
    city: 'Sydney',
    state: 'NSW',
    postalCode: '2000',
    country: 'AU',
    ...overrides,
  });
}
