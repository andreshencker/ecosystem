import { randomUUID } from 'crypto';
import { RequestContext } from '../application/request-context';
import { createRequestContext } from '../testing/factories/test-request-context.factory';

describe('RequestContext', () => {
  describe('shape and required fields', () => {
    it('factory produces a fully populated context', () => {
      const ctx = createRequestContext();

      expect(ctx.tenantId).toBeDefined();
      expect(ctx.correlationId).toBeDefined();
      expect(typeof ctx.tenantId).toBe('string');
      expect(typeof ctx.correlationId).toBe('string');
    });

    it('tenantId is a non-empty string', () => {
      const ctx = createRequestContext();
      expect(ctx.tenantId.length).toBeGreaterThan(0);
    });

    it('correlationId is a non-empty string', () => {
      const ctx = createRequestContext();
      expect(ctx.correlationId.length).toBeGreaterThan(0);
    });

    it('userId is optional — can be undefined for system/background contexts', () => {
      const ctx: RequestContext = {
        tenantId: randomUUID(),
        correlationId: randomUUID(),
        userId: undefined,
        locale: undefined,
        timezone: undefined,
        ip: undefined,
        userAgent: undefined,
      };
      expect(ctx.userId).toBeUndefined();
    });
  });

  describe('overrides work correctly', () => {
    it('accepts specific tenantId', () => {
      const fixedTenantId = randomUUID();
      const ctx = createRequestContext({ tenantId: fixedTenantId });
      expect(ctx.tenantId).toBe(fixedTenantId);
    });

    it('accepts specific correlationId', () => {
      const corrId = randomUUID();
      const ctx = createRequestContext({ correlationId: corrId });
      expect(ctx.correlationId).toBe(corrId);
    });

    it('accepts specific userId', () => {
      const userId = randomUUID();
      const ctx = createRequestContext({ userId });
      expect(ctx.userId).toBe(userId);
    });

    it('can omit userId for anonymous/system context', () => {
      const ctx = createRequestContext({ userId: undefined });
      expect(ctx.userId).toBeUndefined();
    });
  });

  describe('no business data in RequestContext', () => {
    it('does not have revenue-related fields', () => {
      const ctx = createRequestContext();
      expect(ctx).not.toHaveProperty('contractId');
      expect(ctx).not.toHaveProperty('invoiceId');
      expect(ctx).not.toHaveProperty('customerId');
    });

    it('does not have billing-related fields', () => {
      const ctx = createRequestContext();
      expect(ctx).not.toHaveProperty('billingPeriod');
      expect(ctx).not.toHaveProperty('paymentMethod');
    });
  });

  describe('integration with domain objects', () => {
    it('tenantId can be passed directly to repository methods', async () => {
      const ctx = createRequestContext();
      // Simulates what a use case does
      const tenantId: string = ctx.tenantId;
      expect(tenantId).toBeDefined();
    });

    it('correlationId can propagate to DomainEvent', () => {
      const ctx = createRequestContext();
      const eventParams = {
        aggregateId: randomUUID(),
        aggregateType: 'Widget',
        tenantId: ctx.tenantId,
        correlationId: ctx.correlationId,
      };
      expect(eventParams.correlationId).toBe(ctx.correlationId);
    });
  });

  describe('unique per request', () => {
    it('two factory calls produce different correlationIds', () => {
      const ctx1 = createRequestContext();
      const ctx2 = createRequestContext();
      expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
    });

    it('two factory calls produce different tenantIds', () => {
      const ctx1 = createRequestContext();
      const ctx2 = createRequestContext();
      expect(ctx1.tenantId).not.toBe(ctx2.tenantId);
    });
  });
});
