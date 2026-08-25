import type { RoleFlow } from '../role-catalog.service';

export interface DeleteRoleResponseDto {
  flow: RoleFlow;
  roleKey: string;
  deleted: true;
}
