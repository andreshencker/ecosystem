export type GrapiflyFlow = 'client' | 'provider' | 'internal';

export interface GrapiflyJtradeSsoContract {
  contractVersion: 3;
  issuer: 'grapifly';
  audience: 'jtrade';
  grapiflyUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  organization: {
    organizationId: string;
    name: string;
    slug: string;
    status: 'active' | 'suspended' | 'archived';
  };
  access: {
    flow: GrapiflyFlow;
    organizationRole: 'owner' | 'admin' | 'member';
    applicationRole: string;
    tier: 'trial' | 'free' | 'paid';
  };
}
