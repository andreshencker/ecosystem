import { randomUUID } from 'crypto';
import { RequestContext } from '../../application/request-context';

export function createRequestContext(
  overrides?: Partial<RequestContext>,
): RequestContext {
  return {
    tenantId: randomUUID(),
    userId: randomUUID(),
    correlationId: randomUUID(),
    locale: 'en-AU',
    timezone: 'Australia/Sydney',
    ip: '127.0.0.1',
    userAgent: 'test-agent/1.0',
    ...overrides,
  };
}
