import { randomUUID } from 'crypto';
import type { UserRole } from '../../kernel/roles';

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  businessId: string;
  role: UserRole;
  isActive: boolean;
}

export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  const id = randomUUID();
  return {
    id,
    email: `user-${id.slice(0, 8)}@test.local`,
    firstName: 'Test',
    lastName: 'User',
    tenantId: randomUUID(),
    businessId: randomUUID(),
    role: 'staff',
    isActive: true,
    ...overrides,
  };
}
