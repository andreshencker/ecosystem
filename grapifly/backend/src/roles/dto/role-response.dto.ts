import type { RoleFlow } from '../role-catalog.service';

/**
 * What a role catalogue entry looks like over the wire — never expose the
 * raw Mongoose document (its _id, __v, timestamps) directly from a controller.
 */
export interface RoleResponseDto {
  flow: RoleFlow;
  roleKey: string;
  description: string;
  displayOrder: number;
}

export function toRoleResponse(entry: {
  flow: RoleFlow;
  roleKey: string;
  description: string;
  displayOrder: number;
}): RoleResponseDto {
  return {
    flow: entry.flow,
    roleKey: entry.roleKey,
    description: entry.description,
    displayOrder: entry.displayOrder,
  };
}
