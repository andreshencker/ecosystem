import type { ApplicationTheme } from '../../applications/schemas/application.schema';

/**
 * A catalogue app enriched with the current member's access — what the
 * self-service "My apps" page renders. Never includes serviceSecretHash;
 * built from ApplicationsService.listAll(), which is already DTO-mapped.
 */
export interface EnabledApplicationResponseDto {
  key: string;
  name: string;
  description: string;
  launchUrl: string;
  theme: ApplicationTheme;
  tier: 'trial' | 'free' | 'paid';
  memberRole: string | null;
  memberStatus: 'active' | 'suspended' | 'revoked' | 'inactive';
}

export function toEnabledApplicationResponse(entry: {
  key: string;
  name: string;
  description: string;
  launchUrl: string;
  theme: ApplicationTheme;
  tier: 'trial' | 'free' | 'paid';
  memberRole: string | null;
  memberStatus: 'active' | 'suspended' | 'revoked' | 'inactive';
}): EnabledApplicationResponseDto {
  return {
    key: entry.key,
    name: entry.name,
    description: entry.description,
    launchUrl: entry.launchUrl,
    theme: entry.theme,
    tier: entry.tier,
    memberRole: entry.memberRole,
    memberStatus: entry.memberStatus,
  };
}
