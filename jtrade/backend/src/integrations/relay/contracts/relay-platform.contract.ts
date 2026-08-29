export interface RelayPlatform {
  id: string;
  key: string;
  name: string;
  description: string;
  websiteUrl: string;
  logoUrl: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRelayPlatformInput {
  key: string;
  name: string;
  description?: string;
  websiteUrl: string;
  logoUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export type UpdateRelayPlatformInput = Partial<CreateRelayPlatformInput>;
