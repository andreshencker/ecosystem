export type InvitableRole = 'platform_admin' | 'business_admin' | 'accountant' | 'staff' | 'viewer';
export declare class InviteUserDto {
    email: string;
    firstName: string;
    lastName: string;
    role: InvitableRole;
    targetCompanyId?: string;
    targetBusinessKey?: string;
}
