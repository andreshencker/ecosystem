import type { ApplicationTheme } from '../schemas/application.schema';
import type { RoleFlow } from '../../roles/role-catalog.service';

export interface ApplicationPublicConfigDto {
  contractVersion: 1;
  key: string;
  name: string;
  description: string;
  launchUrl: string;
  theme: ApplicationTheme;
  allowedFlows: RoleFlow[];
}
