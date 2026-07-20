export type UserRole = 'platform_admin' | 'business_owner' | 'business_admin' | 'accountant' | 'staff' | 'viewer';
export type UserScope = 'global' | 'company';
export declare const ROLES: {
    readonly PLATFORM_ADMIN: "platform_admin";
    readonly BUSINESS_OWNER: "business_owner";
    readonly BUSINESS_ADMIN: "business_admin";
    readonly ACCOUNTANT: "accountant";
    readonly STAFF: "staff";
    readonly VIEWER: "viewer";
};
export declare const PLATFORM_ROLES: ReadonlyArray<UserRole>;
export declare const BUSINESS_ROLES: ReadonlyArray<UserRole>;
