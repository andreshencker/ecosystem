/**
 * Compile-time and runtime contract tests for the NotifyEventParams discriminated union.
 *
 * These tests verify:
 * - PlatformEventParams must not accept businessId
 * - BusinessEventParams must require businessId
 * - The type discriminant is 'platform' | 'business'
 */

import type {
  NotifyEventParams,
  PlatformEventParams,
  BusinessEventParams,
} from './notify-event-params.interface';

// ── Type narrowing helpers ─────────────────────────────────────────────────────

function isPlatform(p: NotifyEventParams): p is PlatformEventParams {
  return p.type === 'platform';
}

function isBusiness(p: NotifyEventParams): p is BusinessEventParams {
  return p.type === 'business';
}

// ── Runtime tests ─────────────────────────────────────────────────────────────

describe('NotifyEventParams discriminated union', () => {
  const validPlatform: PlatformEventParams = {
    type: 'platform',
    event: 'security.company_forgot_password',
    email: 'user@example.com',
    data: { firstName: 'Alice' },
  };

  const validBusiness: BusinessEventParams = {
    type: 'business',
    businessId: '507f1f77bcf86cd799439011',
    event: 'shifts.shift_created',
    email: 'user@example.com',
    data: { firstName: 'Alice' },
  };

  it('platform event is correctly identified by type discriminant', () => {
    expect(isPlatform(validPlatform)).toBe(true);
    expect(isBusiness(validPlatform)).toBe(false);
  });

  it('business event is correctly identified by type discriminant', () => {
    expect(isBusiness(validBusiness)).toBe(true);
    expect(isPlatform(validBusiness)).toBe(false);
  });

  it('platform event does not have businessId property', () => {
    expect(validPlatform).not.toHaveProperty('businessId');
  });

  it('business event has required businessId property', () => {
    expect(validBusiness).toHaveProperty('businessId');
    expect(typeof validBusiness.businessId).toBe('string');
    expect(validBusiness.businessId.length).toBeGreaterThan(0);
  });

  it('narrowed platform event has no businessId accessible at runtime', () => {
    const params: NotifyEventParams = validPlatform;
    if (isPlatform(params)) {
      // businessId must not exist on PlatformEventParams
      expect((params as any).businessId).toBeUndefined();
    }
  });

  it('narrowed business event exposes businessId after narrowing', () => {
    const params: NotifyEventParams = validBusiness;
    if (isBusiness(params)) {
      expect(params.businessId).toBe('507f1f77bcf86cd799439011');
    }
  });

  it('security events (verify-email, forgot-password, password-changed) are platform events', () => {
    const securityEvents = [
      'security.company_verify_email',
      'security.company_forgot_password',
      'security.company_password_changed',
    ];

    for (const event of securityEvents) {
      const p: PlatformEventParams = {
        type: 'platform',
        event,
        email: 'user@example.com',
        data: {},
      };
      expect(isPlatform(p)).toBe(true);
      expect(p).not.toHaveProperty('businessId');
    }
  });

  it('business operational events require businessId', () => {
    const businessEvents = [
      'shifts.shift_created',
      'contracts.contract_created',
      'linked_calendars.calendar_linked',
      'calendar_sync.sync_completed',
    ];

    for (const event of businessEvents) {
      const p: BusinessEventParams = {
        type: 'business',
        businessId: '507f1f77bcf86cd799439011',
        event,
        email: 'user@example.com',
        data: {},
      };
      expect(isBusiness(p)).toBe(true);
      expect(p.businessId).toBeDefined();
    }
  });
});
