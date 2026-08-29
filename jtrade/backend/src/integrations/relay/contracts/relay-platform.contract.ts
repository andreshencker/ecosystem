export interface RelayPlatform {
  id: string;
  key: string;
  name: string;
  description: string;
  logoUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRelayPlatformInput {
  key: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
}

export type UpdateRelayPlatformInput = Partial<CreateRelayPlatformInput>;
