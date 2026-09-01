// src/types/team.ts
export type TeamRole = "owner" | "admin" | "member";

export type TeamMember = {
    /** Grapifly owns identity; there is no local id. Kept optional so the row
     *  satisfies the shared <DataTable> contract (we pass getRowId explicitly). */
    id?: string;
    grapiflyUserId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: TeamRole;
    status: string;
    createdAt: string;
    updatedAt: string;
};

export type TeamInvitation = {
    id?: string;
    invitationId: string;
    email: string;
    role: TeamRole;
    status: string;
    expiresAt: string;
    createdAt: string;
};

export type TeamList = {
    members: TeamMember[];
    invitations: TeamInvitation[];
};

export type InviteTeamMemberPayload = {
    email: string;
    role: "admin" | "member";
};

export type UpdateTeamMemberPayload = {
    role?: "admin" | "member";
    status?: "active" | "suspended" | "revoked";
};

export type InviteResult = {
    /** Present only when a brand-new invitation was created. */
    inviteUrl: string | null;
    /** True when the email already had a Grapifly account and was added directly. */
    accessGranted?: boolean;
    invitation?: TeamInvitation | null;
};
