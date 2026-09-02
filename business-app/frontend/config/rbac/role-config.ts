import type { ElementType } from 'react';

import ApartmentOutlinedIcon           from '@mui/icons-material/ApartmentOutlined';
import ArticleOutlinedIcon             from '@mui/icons-material/ArticleOutlined';
import AccessTimeOutlinedIcon          from '@mui/icons-material/AccessTimeOutlined';
import BusinessOutlinedIcon            from '@mui/icons-material/BusinessOutlined';
import CalendarMonthOutlinedIcon       from '@mui/icons-material/CalendarMonthOutlined';
import CableOutlinedIcon               from '@mui/icons-material/CableOutlined';
import DashboardOutlinedIcon           from '@mui/icons-material/DashboardOutlined';
import GroupOutlinedIcon               from '@mui/icons-material/GroupOutlined';
import HistoryOutlinedIcon             from '@mui/icons-material/HistoryOutlined';
import EventOutlinedIcon               from '@mui/icons-material/EventOutlined';
import NotificationsNoneOutlinedIcon   from '@mui/icons-material/NotificationsNoneOutlined';
import PersonOutlinedIcon              from '@mui/icons-material/PersonOutlined';
import ReceiptLongOutlinedIcon         from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceOutlinedIcon      from '@mui/icons-material/AccountBalanceOutlined';

import type { UserRole, Scope } from '@/types/api';
import { ALLOWED_ROUTES, LANDING_PAGES } from './route-rules';

// Re-export routing helpers so callers can import from either module.
export { isRouteAllowed, getLandingPage } from './route-rules';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { UserRole, Scope };

export interface UserPermissions {
  canViewAllCompanies: boolean;
  canViewOwnCompany: boolean;
  canCreateCompany: boolean;
  canEditCompany: boolean;
  canDeleteCompany: boolean;
  canDeactivateCompany: boolean;
  canManageThemes: boolean;
  canViewChannels: boolean;
  canManageProviders: boolean;
  canManageCredentials: boolean;
  canManageIntegrations: boolean;
  canViewAllIntegrations: boolean;
  canManageDomains: boolean;
  canManageEvents: boolean;
  canTestNotifications: boolean;
  canManageTemplates: boolean;
  canUploadMedia: boolean;
  canManageStorage: boolean;
  canGenerateReports: boolean;
  canAccessPlatformSettings: boolean;
  canManageUsers: boolean;
  canInviteUsers: boolean;
  canDeactivateUsers: boolean;
  canDeleteUsers: boolean;
  canTransferOwnership: boolean;
  canViewAuditLogs: boolean;
}

export interface NavbarConfig {
  showCompanyName: boolean;
  showRoleBadge: boolean;
  showEnvironmentBadge: boolean;
  showCompanySwitcher: boolean;
  roleBadgeLabel: string;
}

export interface SidebarItemConfig {
  href: string;
  label: string;
  icon: ElementType;
}

export interface SidebarSectionConfig {
  label: string;
  items: SidebarItemConfig[];
}

export type NavbarMode = 'single' | 'dual';

export interface RoleConfig {
  role: UserRole;
  scope: Scope;
  landingPage: string;
  navbar: NavbarConfig;
  navbarMode: NavbarMode;
  sidebar: SidebarSectionConfig[];
  sidebarAdmin?: SidebarSectionConfig[];
  allowedRoutes: string[];
  permissions: UserPermissions;
}

// ─── Permissions baseline ─────────────────────────────────────────────────────

const DENY_ALL: UserPermissions = {
  canViewAllCompanies:       false,
  canViewOwnCompany:         false,
  canCreateCompany:          false,
  canEditCompany:            false,
  canDeleteCompany:          false,
  canDeactivateCompany:      false,
  canManageThemes:           false,
  canViewChannels:           false,
  canManageProviders:        false,
  canManageCredentials:      false,
  canManageIntegrations:     false,
  canViewAllIntegrations:    false,
  canManageDomains:          false,
  canManageEvents:           false,
  canTestNotifications:      false,
  canManageTemplates:        false,
  canUploadMedia:            false,
  canManageStorage:          false,
  canGenerateReports:        false,
  canAccessPlatformSettings: false,
  canManageUsers:            false,
  canInviteUsers:            false,
  canDeactivateUsers:        false,
  canDeleteUsers:            false,
  canTransferOwnership:      false,
  canViewAuditLogs:          false,
};

// ─── Shared sidebar fragments ─────────────────────────────────────────────────

const OVERVIEW_SECTION: SidebarSectionConfig = {
  label: 'Overview',
  items: [
    { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
  ],
};

const CUSTOMERS_SECTION: SidebarSectionConfig = {
  label: 'Customers',
  items: [
    { href: '/customers',  label: 'Customers',  icon: BusinessOutlinedIcon   },
    { href: '/contracts',  label: 'Contracts',  icon: ArticleOutlinedIcon    },
    { href: '/shifts',     label: 'Shifts',     icon: AccessTimeOutlinedIcon },
  ],
};

const BILLING_SECTION: SidebarSectionConfig = {
  label: 'Billing',
  items: [
    { href: '/billing/invoice-approval', label: 'Invoice Review', icon: ReceiptLongOutlinedIcon },
    { href: '/billing/invoices', label: 'Invoices', icon: ReceiptLongOutlinedIcon },
    { href: '/billing/collections', label: 'Collections', icon: ReceiptLongOutlinedIcon },
    { href: '/billing/cash-flow', label: 'Cash Flow', icon: AccountBalanceOutlinedIcon },
  ],
};

// Business App settings — for company-scoped users (owner, admin) and the modules admin acting in Business mode.
const COMPANY_SETTINGS_ITEMS: SidebarItemConfig[] = [
  { href: '/settings/company',                 label: 'My Business',              icon: ApartmentOutlinedIcon           },
  { href: '/settings/profile',                 label: 'Profile',                  icon: PersonOutlinedIcon              },
  { href: '/settings/relay',          label: 'Relay',                    icon: CableOutlinedIcon               },
  { href: '/settings/relay-purposes',  label: 'Relay Purposes',   icon: NotificationsNoneOutlinedIcon   },
  { href: '/settings/relay-events',    label: 'Relay Events',     icon: EventOutlinedIcon               },
  { href: '/settings/calendar',                label: 'Linked Calendars',         icon: CalendarMonthOutlinedIcon       },
];

// Platform Admin mode settings — global SaaS administration only.
// Business App domains (Communications, future Calendar, etc.) must NOT appear here.
const PLATFORM_ADMIN_SETTINGS_ITEMS: SidebarItemConfig[] = [
  { href: '/settings/company', label: 'My Business', icon: ApartmentOutlinedIcon },
  { href: '/settings/profile', label: 'Profile',     icon: PersonOutlinedIcon    },
];

const PROFILE_ONLY_ITEMS: SidebarItemConfig[] = [
  { href: '/settings/profile', label: 'Profile', icon: PersonOutlinedIcon },
];

// ─── Role configurations ──────────────────────────────────────────────────────

const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {

  // ══════════════════════════════════════════════════════════════════════════
  // PLATFORM ADMIN — global scope, dual-mode navigation
  // ══════════════════════════════════════════════════════════════════════════
  platform_admin: {
    role: 'platform_admin',
    scope: 'global',
    landingPage: LANDING_PAGES.platform_admin,
    navbarMode: 'dual',
    navbar: {
      showCompanyName:      false,
      showRoleBadge:        true,
      showEnvironmentBadge: true,
      showCompanySwitcher:  false,
      roleBadgeLabel:       'Platform Admin',
    },
    sidebar: [
      OVERVIEW_SECTION,
      { label: 'Users',    items: [{ href: '/users', label: 'Team', icon: GroupOutlinedIcon }] },
      { label: 'Settings', items: COMPANY_SETTINGS_ITEMS },
    ],
    sidebarAdmin: [
      OVERVIEW_SECTION,
      {
        label: 'Customers',
        items: [
          { href: '/platform-admin/customers', label: 'All Customers', icon: BusinessOutlinedIcon },
          { href: '/platform-admin/contracts', label: 'All Contracts',  icon: ArticleOutlinedIcon  },
        ],
      },
      { label: 'Security', items: [{ href: '/audit-logs', label: 'Audit Logs', icon: HistoryOutlinedIcon }] },
      { label: 'Users',    items: [{ href: '/users', label: 'Team', icon: GroupOutlinedIcon }] },
      { label: 'Settings', items: PLATFORM_ADMIN_SETTINGS_ITEMS },
    ],
    allowedRoutes: ALLOWED_ROUTES.platform_admin,
    permissions: {
      ...DENY_ALL,
      canViewAllCompanies:       true,
      canCreateCompany:          true,
      canEditCompany:            true,
      canDeleteCompany:          true,
      canDeactivateCompany:      true,
      canManageThemes:           true,
      canViewChannels:           true,
      canManageProviders:        true,
      canManageCredentials:      true,
      canManageIntegrations:     true,
      canViewAllIntegrations:    true,
      canManageDomains:          true,
      canManageEvents:           true,
      canTestNotifications:      true,
      canManageTemplates:        true,
      canUploadMedia:            true,
      canManageStorage:          true,
      canGenerateReports:        true,
      canAccessPlatformSettings: true,
      canManageUsers:            true,
      canInviteUsers:            true,
      canDeactivateUsers:        true,
      canDeleteUsers:            true,
      canTransferOwnership:      false,
      canViewAuditLogs:          true,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BUSINESS OWNER — full access within their own company
  // ══════════════════════════════════════════════════════════════════════════
  business_owner: {
    role: 'business_owner',
    scope: 'company',
    landingPage: LANDING_PAGES.business_owner,
    navbarMode: 'single',
    navbar: {
      showCompanyName:      true,
      showRoleBadge:        true,
      showEnvironmentBadge: false,
      showCompanySwitcher:  false,
      roleBadgeLabel:       'Owner',
    },
    sidebar: [
      OVERVIEW_SECTION,
      CUSTOMERS_SECTION,
      BILLING_SECTION,
      { label: 'Users',    items: [{ href: '/users', label: 'Team', icon: GroupOutlinedIcon }] },
      { label: 'Settings', items: COMPANY_SETTINGS_ITEMS },
    ],
    allowedRoutes: ALLOWED_ROUTES.business_owner,
    permissions: {
      ...DENY_ALL,
      canViewOwnCompany:     true,
      canEditCompany:        true,
      canManageThemes:       true,
      canManageCredentials:  true,
      canManageIntegrations: true,
      canManageDomains:      true,
      canManageEvents:       true,
      canTestNotifications:  true,
      canManageTemplates:    true,
      canUploadMedia:        true,
      canManageStorage:      true,
      canGenerateReports:    true,
      canManageUsers:        true,
      canInviteUsers:        true,
      canDeactivateUsers:    true,
      canDeleteUsers:        true,
      canTransferOwnership:  true,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BUSINESS ADMIN — operational management; no destructive company actions
  // ══════════════════════════════════════════════════════════════════════════
  business_admin: {
    role: 'business_admin',
    scope: 'company',
    landingPage: LANDING_PAGES.business_admin,
    navbarMode: 'single',
    navbar: {
      showCompanyName:      true,
      showRoleBadge:        true,
      showEnvironmentBadge: false,
      showCompanySwitcher:  false,
      roleBadgeLabel:       'Admin',
    },
    sidebar: [
      OVERVIEW_SECTION,
      CUSTOMERS_SECTION,
      BILLING_SECTION,
      { label: 'Users',    items: [{ href: '/users', label: 'Team', icon: GroupOutlinedIcon }] },
      { label: 'Settings', items: COMPANY_SETTINGS_ITEMS },
    ],
    allowedRoutes: ALLOWED_ROUTES.business_admin,
    permissions: {
      ...DENY_ALL,
      canViewOwnCompany:     true,
      canManageThemes:       true,
      canManageCredentials:  true,
      canManageIntegrations: true,
      canManageDomains:      true,
      canManageEvents:       true,
      canTestNotifications:  true,
      canManageTemplates:    true,
      canUploadMedia:        true,
      canManageStorage:      true,
      canGenerateReports:    true,
      canManageUsers:        true,
      canInviteUsers:        true,
      canDeactivateUsers:    true,
      canDeleteUsers:        false,
      canTransferOwnership:  false,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACCOUNTANT — financial access: invoices, payments, reports, exports
  // ══════════════════════════════════════════════════════════════════════════
  accountant: {
    role: 'accountant',
    scope: 'company',
    landingPage: LANDING_PAGES.accountant,
    navbarMode: 'single',
    navbar: {
      showCompanyName:      true,
      showRoleBadge:        true,
      showEnvironmentBadge: false,
      showCompanySwitcher:  false,
      roleBadgeLabel:       'Accountant',
    },
    sidebar: [
      OVERVIEW_SECTION,
      CUSTOMERS_SECTION,
      BILLING_SECTION,
      { label: 'Settings', items: PROFILE_ONLY_ITEMS },
    ],
    allowedRoutes: ALLOWED_ROUTES.accountant,
    permissions: {
      ...DENY_ALL,
      canGenerateReports: true,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STAFF — operational access: customers, jobs, draft invoices
  // ══════════════════════════════════════════════════════════════════════════
  staff: {
    role: 'staff',
    scope: 'company',
    landingPage: LANDING_PAGES.staff,
    navbarMode: 'single',
    navbar: {
      showCompanyName:      true,
      showRoleBadge:        true,
      showEnvironmentBadge: false,
      showCompanySwitcher:  false,
      roleBadgeLabel:       'Staff',
    },
    sidebar: [
      OVERVIEW_SECTION,
      CUSTOMERS_SECTION,
      { label: 'Settings', items: PROFILE_ONLY_ITEMS },
    ],
    allowedRoutes: ALLOWED_ROUTES.staff,
    permissions: {
      ...DENY_ALL,
      canGenerateReports: true,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VIEWER — read-only access
  // ══════════════════════════════════════════════════════════════════════════
  viewer: {
    role: 'viewer',
    scope: 'company',
    landingPage: LANDING_PAGES.viewer,
    navbarMode: 'single',
    navbar: {
      showCompanyName:      true,
      showRoleBadge:        true,
      showEnvironmentBadge: false,
      showCompanySwitcher:  false,
      roleBadgeLabel:       'Viewer',
    },
    sidebar: [
      OVERVIEW_SECTION,
      { label: 'Settings', items: PROFILE_ONLY_ITEMS },
    ],
    allowedRoutes: ALLOWED_ROUTES.viewer,
    permissions: {
      ...DENY_ALL,
      canGenerateReports: true,
    },
  },
};

// ─── Public accessors ─────────────────────────────────────────────────────────

export function getRoleConfig(role: UserRole): RoleConfig {
  const config = ROLE_CONFIGS[role];
  if (!config) throw new Error(`[role-config] Unknown role: "${role}"`);
  return config;
}

export function getNavbarConfig(role: UserRole): NavbarConfig {
  return getRoleConfig(role).navbar;
}

export function getSidebarConfig(role: UserRole): SidebarSectionConfig[] {
  return getRoleConfig(role).sidebar;
}

export function getPermissions(role: UserRole): UserPermissions {
  return getRoleConfig(role).permissions;
}

export function getAdminSidebarConfig(role: UserRole): SidebarSectionConfig[] {
  return getRoleConfig(role).sidebarAdmin ?? getRoleConfig(role).sidebar;
}

export function getNavbarMode(role: UserRole): NavbarMode {
  return getRoleConfig(role).navbarMode;
}
