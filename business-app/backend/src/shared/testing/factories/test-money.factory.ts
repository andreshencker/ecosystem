import { Money } from '../../domain/value-objects/money.vo';

export function createMoney(
  amount: number = 100,
  currency: string = 'AUD',
): Money {
  return Money.of(amount, currency);
}
