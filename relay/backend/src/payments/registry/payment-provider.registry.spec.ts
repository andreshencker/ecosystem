// src/payments/registry/payment-provider.registry.spec.ts

import { PaymentProviderRegistry } from './payment-provider.registry';
import {
  DuplicateProviderRegistrationError,
  PaymentProviderNotFoundError,
} from '../errors/payment.errors';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import { PaymentCapability, CapabilityStatus } from '../enums/payment.enums';

// ─── Test double ─────────────────────────────────────────────────────────────

function makeProvider(key: string): IPaymentProvider {
  return {
    providerKey: key,
    displayName: `${key} Provider`,
    description: `Test provider: ${key}`,
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: key,
      displayName: `${key} Provider`,
      description: `Test provider: ${key}`,
      connectionType: 'api_key',
    }),
  };
}

const mockStripe = makeProvider('stripe');
const mockPayPal = makeProvider('paypal');
const mockStripe2 = makeProvider('stripe'); // duplicate key

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentProviderRegistry', () => {
  describe('construction', () => {
    it('creates an empty registry when no providers are supplied', () => {
      const registry = new PaymentProviderRegistry([]);
      expect(registry.size).toBe(0);
      expect(registry.listAll()).toHaveLength(0);
    });

    it('registers a single provider', () => {
      const registry = new PaymentProviderRegistry([mockStripe]);
      expect(registry.size).toBe(1);
    });

    it('registers multiple providers', () => {
      const registry = new PaymentProviderRegistry([mockStripe, mockPayPal]);
      expect(registry.size).toBe(2);
    });

    it('throws DuplicateProviderRegistrationError for a duplicate providerKey', () => {
      expect(
        () => new PaymentProviderRegistry([mockStripe, mockStripe2]),
      ).toThrow(DuplicateProviderRegistrationError);
    });

    it('includes the providerKey in the duplicate registration error message', () => {
      expect(
        () => new PaymentProviderRegistry([mockStripe, mockStripe2]),
      ).toThrow('stripe');
    });
  });

  describe('resolve', () => {
    let registry: PaymentProviderRegistry;

    beforeEach(() => {
      registry = new PaymentProviderRegistry([mockStripe, mockPayPal]);
    });

    it('returns the correct provider for a known key', () => {
      expect(registry.resolve('stripe')).toBe(mockStripe);
      expect(registry.resolve('paypal')).toBe(mockPayPal);
    });

    it('throws PaymentProviderNotFoundError for an unknown key', () => {
      expect(() => registry.resolve('adyen')).toThrow(
        PaymentProviderNotFoundError,
      );
    });

    it('includes the unknown providerKey in the not-found error message', () => {
      expect(() => registry.resolve('adyen')).toThrow('adyen');
    });

    it('is case-sensitive — "Stripe" does not resolve "stripe"', () => {
      expect(() => registry.resolve('Stripe')).toThrow(
        PaymentProviderNotFoundError,
      );
    });
  });

  describe('listAll', () => {
    it('returns all registered providers in registration order', () => {
      const registry = new PaymentProviderRegistry([mockStripe, mockPayPal]);
      const list = registry.listAll();
      expect(list).toHaveLength(2);
      expect(list[0].providerKey).toBe('stripe');
      expect(list[1].providerKey).toBe('paypal');
    });

    it('returns an empty array when no providers are registered', () => {
      const registry = new PaymentProviderRegistry([]);
      expect(registry.listAll()).toEqual([]);
    });
  });

  describe('has', () => {
    it('returns true for a registered key', () => {
      const registry = new PaymentProviderRegistry([mockStripe]);
      expect(registry.has('stripe')).toBe(true);
    });

    it('returns false for an unregistered key', () => {
      const registry = new PaymentProviderRegistry([mockStripe]);
      expect(registry.has('paypal')).toBe(false);
    });
  });

  describe('capability reporting', () => {
    it('providers expose capabilities without throwing', () => {
      const registry = new PaymentProviderRegistry([mockStripe]);
      const provider = registry.resolve('stripe');
      expect(() => provider.getCapabilities()).not.toThrow();
    });

    it('provider metadata is accessible without network calls', () => {
      const registry = new PaymentProviderRegistry([mockStripe]);
      const provider = registry.resolve('stripe');
      const meta = provider.getMetadata();
      expect(meta.providerKey).toBe('stripe');
    });
  });

  describe('credential isolation', () => {
    it('providers do not hold credential values', () => {
      const registry = new PaymentProviderRegistry([mockStripe]);
      const provider = registry.resolve('stripe');
      // Reflect.get safely returns undefined for missing properties.
      expect(Reflect.get(provider, 'secretKey')).toBeUndefined();
      expect(Reflect.get(provider, 'credentials')).toBeUndefined();
      expect(Reflect.get(provider, 'apiKey')).toBeUndefined();
    });
  });

  describe('existing channels not affected', () => {
    it('registry has no knowledge of other channel types', () => {
      const registrySource = PaymentProviderRegistry.toString();
      expect(registrySource).not.toContain('email');
      expect(registrySource).not.toContain('sms');
      expect(registrySource).not.toContain('calendar');
    });
  });

  describe('PaymentCapability enum', () => {
    it('exposes all expected technical capability keys', () => {
      const expected: string[] = [
        'account',
        'balance',
        'oneTimePayments',
        'recurringPayments',
        'paymentMethods',
        'checkout',
        'refunds',
        'disputes',
        'payouts',
        'webhooks',
        'paymentLinks',
      ];
      const actual = Object.values(PaymentCapability) as string[];
      for (const cap of expected) {
        expect(actual).toContain(cap);
      }
    });

    it('does not contain removed business-domain capabilities', () => {
      const actual = Object.values(PaymentCapability) as string[];
      expect(actual).not.toContain('customers');
      expect(actual).not.toContain('products');
      expect(actual).not.toContain('prices');
      expect(actual).not.toContain('subscriptions');
      expect(actual).not.toContain('invoices');
    });
  });

  describe('CapabilityStatus', () => {
    it('exposes available, planned, and unsupported status values', () => {
      expect(CapabilityStatus.Available).toBe('available');
      expect(CapabilityStatus.Planned).toBe('planned');
      expect(CapabilityStatus.Unsupported).toBe('unsupported');
    });
  });
});
