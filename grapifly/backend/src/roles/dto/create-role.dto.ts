import type { RoleFlow } from '../role-catalog.service';

export interface CreateRoleDto {
  flow: RoleFlow;
  roleKey: string;
  description: string;
}
