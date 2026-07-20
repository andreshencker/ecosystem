export const PERMISSIONS = {
  BUSINESS_READ: 'business:read',
  BUSINESS_WRITE: 'business:write',

  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_INVITE: 'users:invite',

  REVENUE_READ: 'revenue:read',
  REVENUE_WRITE: 'revenue:write',

  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',

  CUSTOMER_READ: 'customer:read',
  CUSTOMER_WRITE: 'customer:write',

  ANALYTICS_READ: 'analytics:read',

  WORK_READ: 'work:read',
  WORK_WRITE: 'work:write',

  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_WRITE: 'documents:write',

  PLATFORM_ADMIN: 'modules:admin',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
