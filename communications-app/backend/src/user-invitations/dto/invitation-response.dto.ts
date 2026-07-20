// src/modules/user-invitations/dto/invitation-response.dto.ts

import type { UserRole } from '../../users/schemas/user.schema';
import type {
  InvitationScope,
  InvitationStatus,
} from '../schemas/invitation.schema';

export class InvitationResponseDto {
  id!: string;
  userId!: string | null;
  email!: string;
  firstName!: string;
  lastName!: string;
  role!: UserRole;
  status!: InvitationStatus;
  companyId!: string | null;
  companyKey!: string | null;
  invitationScope!: InvitationScope;
  senderCredentialScope!: InvitationScope;
  expiresAt!: string;
  createdAt!: string;
  updatedAt!: string;
  invitedByUserId!: string | null;
}
