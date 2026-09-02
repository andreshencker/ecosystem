import type { RoleFlow } from '../../roles/role-catalog.service';
import type { ApplicationCountryRestriction, ApplicationDefaultAccess, ApplicationTheme } from '../schemas/application.schema';

/**
 * What an application catalogue entry looks like over the wire — never
 * expose the raw Mongoose document (its _id, __v) or serviceSecretHash.
 */
export interface ApplicationResponseDto {
  key: string;
  name: string;
  description: string;
  launchUrl: string;
  ssoCallbackUrl: string | null;
  ownership: 'first_party' | 'third_party';
  status: 'active' | 'inactive';
  displayOrder: number;
  isPrimary: boolean;
  theme: ApplicationTheme;
  defaultAccess: ApplicationDefaultAccess;
  countryRestriction: ApplicationCountryRestriction;
  allowedFlows: RoleFlow[];
}

export function toApplicationResponse(entry: {
  key: string;
  name: string;
  description: string;
  launchUrl: string;
  ssoCallbackUrl?: string | null;
  ownership: 'first_party' | 'third_party';
  status: 'active' | 'inactive';
  displayOrder: number;
  isPrimary?: boolean;
  theme: ApplicationTheme;
  defaultAccess: ApplicationDefaultAccess;
  countryRestriction: ApplicationCountryRestriction;
  allowedFlows: RoleFlow[];
}): ApplicationResponseDto {
  return {
    key: entry.key,
    name: entry.name,
    description: entry.description,
    launchUrl: entry.launchUrl,
    ssoCallbackUrl: entry.ssoCallbackUrl ?? null,
    ownership: entry.ownership,
    status: entry.status,
    displayOrder: entry.displayOrder,
    isPrimary: entry.isPrimary ?? false,
    theme: entry.theme,
    defaultAccess: entry.defaultAccess,
    countryRestriction: entry.countryRestriction,
    allowedFlows: entry.allowedFlows,
  };
}
