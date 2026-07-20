import { randomUUID } from 'crypto';

export interface TestBusiness {
  id: string;
  businessKey: string;
  businessName: string;
  tenantId: string;
  ownerUserId: string | null;
  defaultCurrency: string;
  isActive: boolean;
}

export function createTestBusiness(
  overrides?: Partial<TestBusiness>,
): TestBusiness {
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    id: randomUUID(),
    businessKey: `test-biz-${suffix}`,
    businessName: 'Test Business Ltd',
    tenantId: randomUUID(),
    ownerUserId: null,
    defaultCurrency: 'AUD',
    isActive: true,
    ...overrides,
  };
}
