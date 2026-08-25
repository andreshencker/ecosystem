import type { RoleFlow } from '../../roles/role-catalog.service';
import type { ApplicationCountryRestriction, ApplicationDefaultAccess, ApplicationTheme } from '../schemas/application.schema';

export interface UpdateApplicationDto {
  name?: string;
  description?: string;
  launchUrl?: string;
  ssoCallbackUrl?: string | null;
  ownership?: 'first_party' | 'third_party';
  status?: 'active' | 'inactive';
  displayOrder?: number;
  theme?: Partial<Omit<ApplicationTheme, 'light' | 'dark'>> & {
    light?: Partial<ApplicationTheme['light']>;
    dark?: Partial<ApplicationTheme['dark']>;
  };
  defaultAccess?: Partial<ApplicationDefaultAccess>;
  countryRestriction?: Partial<ApplicationCountryRestriction>;
  allowedFlows?: RoleFlow[];
}
