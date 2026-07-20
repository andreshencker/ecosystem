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
export declare function createTestUser(overrides?: Partial<TestUser>): TestUser;
