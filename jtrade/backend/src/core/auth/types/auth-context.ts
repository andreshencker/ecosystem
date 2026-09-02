export enum ApplicationRole {
  ADMIN = 'admin',
  CLIENT = 'client',
  PROVIDER = 'provider',
}

export type AccessTier = 'trial' | 'free' | 'paid';

export interface AuthContext {
  sub: string;
  grapiflyUserId: string;
  organizationId: string;
  flow: 'client' | 'provider' | 'internal';
  role: ApplicationRole;
  applicationRole: string;
  accessTier: AccessTier;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  tokenType: 'access' | 'refresh';
}
