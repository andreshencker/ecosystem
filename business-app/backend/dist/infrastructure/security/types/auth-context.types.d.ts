export type { UserRole, UserScope, } from '../../../modules/users/schemas/user.schema';
import type { UserRole, UserScope } from '../../../modules/users/schemas/user.schema';
export interface AuthContext {
    actorType: 'user' | 'apikey';
    userId?: string;
    email?: string;
    role?: UserRole;
    scope?: UserScope;
    companyId?: string | null;
    businessKey?: string | null;
    organizationId?: string;
    keyId?: string;
}
