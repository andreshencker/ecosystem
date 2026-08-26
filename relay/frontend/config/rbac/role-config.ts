import type { ElementType } from 'react';

import CalendarMonthOutlinedIcon        from '@mui/icons-material/CalendarMonthOutlined';
import DashboardOutlinedIcon           from '@mui/icons-material/DashboardOutlined';
import PaletteOutlinedIcon             from '@mui/icons-material/PaletteOutlined';
import BusinessOutlinedIcon            from '@mui/icons-material/BusinessOutlined';
import DomainOutlinedIcon              from '@mui/icons-material/DomainOutlined';
import RouterOutlinedIcon              from '@mui/icons-material/RouterOutlined';
import ExtensionOutlinedIcon           from '@mui/icons-material/ExtensionOutlined';
import VpnKeyOutlinedIcon              from '@mui/icons-material/VpnKeyOutlined';
import ArticleOutlinedIcon             from '@mui/icons-material/ArticleOutlined';
import AccountTreeOutlinedIcon         from '@mui/icons-material/AccountTreeOutlined';
import EventOutlinedIcon               from '@mui/icons-material/EventOutlined';
import GroupOutlinedIcon               from '@mui/icons-material/GroupOutlined';
import AdminPanelSettingsOutlinedIcon  from '@mui/icons-material/AdminPanelSettingsOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import NotificationsOutlinedIcon       from '@mui/icons-material/NotificationsOutlined';
import NotificationsOffOutlinedIcon    from '@mui/icons-material/NotificationsOffOutlined';
import PersonOutlinedIcon              from '@mui/icons-material/PersonOutlined';
import HistoryOutlinedIcon             from '@mui/icons-material/HistoryOutlined';
import ApiOutlinedIcon                 from '@mui/icons-material/ApiOutlined';
import QueryStatsOutlinedIcon          from '@mui/icons-material/QueryStatsOutlined';
import BugReportOutlinedIcon           from '@mui/icons-material/BugReportOutlined';
import SettingsOutlinedIcon            from '@mui/icons-material/SettingsOutlined';
import PlayCircleOutlineOutlinedIcon   from '@mui/icons-material/PlayCircleOutlineOutlined';
import SecurityOutlinedIcon            from '@mui/icons-material/SecurityOutlined';
import FolderOutlinedIcon              from '@mui/icons-material/FolderOutlined';
import CloudOutlinedIcon               from '@mui/icons-material/CloudOutlined';
import DescriptionOutlinedIcon         from '@mui/icons-material/DescriptionOutlined';
import AccountBalanceOutlinedIcon        from '@mui/icons-material/AccountBalanceOutlined';
import LinkOutlinedIcon                 from '@mui/icons-material/LinkOutlined';
import ReceiptLongOutlinedIcon          from '@mui/icons-material/ReceiptLongOutlined';
import MenuBookOutlinedIcon             from '@mui/icons-material/MenuBookOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CompareArrowsOutlinedIcon        from '@mui/icons-material/CompareArrowsOutlined';
import BadgeOutlinedIcon                from '@mui/icons-material/BadgeOutlined';
import MailOutlineOutlinedIcon          from '@mui/icons-material/MailOutlineOutlined';
import InboxOutlinedIcon                from '@mui/icons-material/InboxOutlined';

import CreditCardOutlinedIcon          from '@mui/icons-material/CreditCardOutlined';
import PaymentsOutlinedIcon            from '@mui/icons-material/PaymentsOutlined';
import UndoOutlinedIcon                from '@mui/icons-material/UndoOutlined';
import SendOutlinedIcon                from '@mui/icons-material/SendOutlined';
import WebhookOutlinedIcon             from '@mui/icons-material/WebhookOutlined';
import ScienceOutlinedIcon             from '@mui/icons-material/ScienceOutlined';
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined';

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

/** One channel tab in the sidebar (Setup, Calendar, Payments, Accounting, …). */
export interface SidebarTabConfig {
  key: string;
  label: string;
  icon: ElementType;
  items: SidebarItemConfig[];
  /**
   * channelKeys (from the channel catalog — "calendar", "payment", "email", …)
   * required for this tab to show. Undefined/omitted = always shown (e.g. Setup,
   * where channels get configured in the first place). When set, the tab shows
   * if the company has an active credential for ANY of the listed channels.
   */
  requiresChannel?: string[];
  /**
   * providerKeys (from the provider catalog — "gmail_oauth", "xero", …)
   * required for this tab to show, IN ADDITION to requiresChannel. Use this
   * when only some providers within a channel support the capability the tab
   * needs — e.g. only gmail_oauth can read a mailbox, while the "email"
   * channel also covers send-only providers (SMTP, Mailgun, SendGrid). When
   * set, the tab shows only if the company has an active credential for ANY
   * of the listed providers.
   */
  requiresProviderKey?: string[];
}

/** Whether this role has a dual-mode nav (Business App / Platform Admin). */
export type NavbarMode = 'single' | 'dual';

export interface RoleConfig {
  role: UserRole;
  scope: Scope;
  landingPage: string;
  navbar: NavbarConfig;
  navbarMode: NavbarMode;
  /** Always-visible, above the channel tabs (currently just Dashboard). */
  sidebarTop: SidebarItemConfig[];
  /** Channel tabs — only one tab's items show at a time. Empty for roles with no channel setup access. */
  sidebarTabs: SidebarTabConfig[];
  /** Always-visible, below the active tab's items (Team, Profile, …). */
  sidebarCommon: SidebarItemConfig[];
  /** Sidebar shown in Platform Admin mode — only set for platform_admin. */
  sidebarAdmin?: SidebarSectionConfig[];
  allowedRoutes: string[];
  permissions: UserPermissions;
}

// ─── Permissions baseline ─────────────────────────────────────────────────────

const DENY_ALL: UserPermissions = {
  canViewAllCompanies:      false,
  canViewOwnCompany:        false,
  canCreateCompany:         false,
  canEditCompany:           false,
  canDeleteCompany:         false,
  canDeactivateCompany:     false,
  canManageThemes:          false,
  canViewChannels:          false,
  canManageProviders:       false,
  canManageCredentials:     false,
  canManageDomains:         false,
  canManageEvents:          false,
  canTestNotifications:     false,
  canManageTemplates:       false,
  canUploadMedia:           false,
  canManageStorage:         false,
  canGenerateReports:       false,
  canAccessPlatformSettings:false,
  canManageUsers:           false,
  canInviteUsers:           false,
  canDeactivateUsers:       false,
  canDeleteUsers:           false,
  canTransferOwnership:     false,
  canViewAuditLogs:         false,
};

// ─── Role configurations ──────────────────────────────────────────────────────
//
// SINGLE SOURCE OF TRUTH for:
//   1. Post-login redirect       → landingPage
//   2. Navbar rendering          → navbar config (Topbar reads this — no inline role logic)
//   3. Sidebar rendering         → sidebar sections (Sidebar reads this — no inline role logic)
//   4. Route authorization       → allowedRoutes (middleware reads route-rules.ts directly)
//   5. Permission authorization  → permissions (usePermissions / PermissionGuard read this)
//
// Sidebar order follows DEC-016 (Navigation Configuration Flow).
// The sidebar is a guided setup workflow — top to bottom = full modules configured.
//
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {

  // ══════════════════════════════════════════════════════════════════════════
  // PLATFORM ADMIN — global scope
  //
  // Dual-mode navigation (navbarMode: 'dual'):
  //
  //   Business App (sidebar)        — company configuration workflow view
  //   Platform Admin (sidebarAdmin) — global admin / modules management view
  //
  // platform_admin switches between modes via the topbar tab switcher.
  // ══════════════════════════════════════════════════════════════════════════
  platform_admin: {
    role: 'platform_admin',
    scope: 'global',
    landingPage: LANDING_PAGES.platform_admin,
    navbarMode: 'dual',
    navbar: {
      showCompanyName:     false,
      showRoleBadge:       true,
      showEnvironmentBadge:true,
      showCompanySwitcher: false,
      roleBadgeLabel:      'Platform Admin',
    },

    // ── Business App sidebar (Dashboard → channel tabs → common) ───────────
    sidebarTop: [
      { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
    ],
    sidebarTabs: [
      {
        key: 'setup',
        label: 'Setup',
        icon: SettingsOutlinedIcon,
        items: [
          { href: '/company',                   label: 'My Company',        icon: DomainOutlinedIcon              },
          { href: '/company/themes',            label: 'Theme',             icon: PaletteOutlinedIcon             },
          { href: '/provider-credentials',      label: 'Credentials',       icon: VpnKeyOutlinedIcon              },
          { href: '/layout-templates',          label: 'Templates',         icon: ArticleOutlinedIcon             },
          { href: '/document-domain-catalogue', label: 'Doc Domains',       icon: FolderOutlinedIcon              },
          { href: '/document-catalogue',        label: 'Documents',         icon: DescriptionOutlinedIcon         },
        ],
      },
      {
        key: 'calendar',
        label: 'Calendar',
        icon: CalendarMonthOutlinedIcon,
        requiresChannel: ['calendar'],
        items: [
          { href: '/calendar/calendars', label: 'Calendars', icon: CalendarMonthOutlinedIcon },
          { href: '/calendar/events',    label: 'Events',    icon: EventOutlinedIcon          },
        ],
      },
      {
        key: 'payments',
        label: 'Payments',
        icon: PaymentsOutlinedIcon,
        requiresChannel: ['payment'],
        items: [
          { href: '/payments',                 label: 'Dashboard',       icon: AccountBalanceOutlinedIcon          },
          { href: '/payments/payment-methods', label: 'Payment Methods', icon: CreditCardOutlinedIcon              },
          { href: '/payments/testing',         label: 'Payment Testing', icon: ScienceOutlinedIcon                 },
          { href: '/payments/payments',        label: 'Payments',        icon: PaymentsOutlinedIcon                },
          { href: '/payments/refunds',         label: 'Refunds',         icon: UndoOutlinedIcon                    },
          { href: '/payments/payouts',         label: 'Payouts',         icon: SendOutlinedIcon                    },
          { href: '/payments/webhooks',        label: 'Webhooks',        icon: WebhookOutlinedIcon                 },
          { href: '/payments/gateway',         label: 'Gateway',         icon: IntegrationInstructionsOutlinedIcon },
          { href: '/payments/settings',        label: 'Settings',        icon: SettingsOutlinedIcon                },
        ],
      },
      {
        key: 'accounting',
        label: 'Accounting',
        icon: AccountBalanceWalletOutlinedIcon,
        requiresChannel: ['accounting'],
        items: [
          { href: '/accounting/bank-connections',         label: 'Bank Connections',        icon: LinkOutlinedIcon                    },
          { href: '/accounting/bank-feed',                label: 'Bank Feed',               icon: AccountBalanceWalletOutlinedIcon    },
          { href: '/accounting/accounting-transactions',  label: 'Accounting Transactions', icon: ReceiptLongOutlinedIcon             },
          { href: '/accounting/reconciliation',           label: 'Reconciliation',          icon: CompareArrowsOutlinedIcon           },
          { href: '/accounting/manual-journals',          label: 'Manual Journals',         icon: IntegrationInstructionsOutlinedIcon },
          { href: '/accounting/general-ledger',           label: 'General Ledger',          icon: MenuBookOutlinedIcon                },
          { href: '/accounting/chart-of-accounts',        label: 'Chart of Accounts',       icon: AccountTreeOutlinedIcon             },
        ],
      },
      {
        key: 'notifications',
        label: 'Notifications',
        icon: NotificationsOutlinedIcon,
        requiresChannel: ['email', 'sms'],
        items: [
          { href: '/notifications',      label: 'Notifications',      icon: NotificationsOutlinedIcon       },
          { href: '/domain-catalogue',   label: 'Domains',            icon: AccountTreeOutlinedIcon         },
          { href: '/event-catalogue',    label: 'Events',             icon: EventOutlinedIcon               },
          { href: '/notifications/test', label: 'Test Notifications', icon: NotificationsActiveOutlinedIcon },
        ],
      },
      {
        key: 'email',
        label: 'Email',
        icon: MailOutlineOutlinedIcon,
        requiresChannel: ['email'],
        requiresProviderKey: ['gmail_oauth'],
        items: [
          { href: '/email/inbox', label: 'Inbox', icon: InboxOutlinedIcon },
        ],
      },
      {
        key: 'identity',
        label: 'Identity',
        icon: BadgeOutlinedIcon,
        requiresChannel: ['identity'],
        items: [
          { href: '/identity/documentation', label: 'Documentation', icon: MenuBookOutlinedIcon                },
        ],
      },
      {
        key: 'storage',
        label: 'Storage',
        icon: CloudOutlinedIcon,
        requiresChannel: ['storage'],
        items: [
          { href: '/storage-domain-catalogue', label: 'Storage Domains', icon: FolderOutlinedIcon },
        ],
      },
    ],
    sidebarCommon: [
      { href: '/users',            label: 'Team',    icon: GroupOutlinedIcon  },
      { href: '/settings/profile', label: 'Profile', icon: PersonOutlinedIcon },
    ],

    // ── Platform Admin sidebar (DEC-016 modules management structure) ─────
    sidebarAdmin: [
      {
        label: 'Overview',
        items: [
          { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
        ],
      },
      {
        label: 'Platform',
        items: [
          { href: '/companies',       label: 'Companies',       icon: BusinessOutlinedIcon           },
          { href: '/platform-admins', label: 'Platform Admins', icon: AdminPanelSettingsOutlinedIcon },
        ],
      },
      {
        label: 'Communication Catalog',
        items: [
          { href: '/channels',                         label: 'Channels',         icon: RouterOutlinedIcon            },
          { href: '/providers',                        label: 'Providers',        icon: ExtensionOutlinedIcon         },
          { href: '/modules/provider-configurations', label: 'Provider Schemas', icon: SettingsOutlinedIcon          },
          { href: '/global-templates',                 label: 'Global Templates', icon: ArticleOutlinedIcon           },
        ],
      },
      {
        label: 'Operations',
        items: [
          { href: '/modules/provider-testing',        label: 'Provider Testing',      icon: PlayCircleOutlineOutlinedIcon },
          { href: '/support/failed-notifications',     label: 'Failed Notifications',  icon: NotificationsOffOutlinedIcon  },
          { href: '/support/company-activity',         label: 'Company Activity',      icon: QueryStatsOutlinedIcon        },
          { href: '/support/api-usage',                label: 'API Usage',             icon: ApiOutlinedIcon               },
        ],
      },
      {
        label: 'Security',
        items: [
          { href: '/global-users', label: 'Global Users', icon: SecurityOutlinedIcon   },
          { href: '/audit-logs',   label: 'Audit Logs',   icon: HistoryOutlinedIcon    },
          { href: '/support/error-logs', label: 'Error Logs', icon: BugReportOutlinedIcon },
        ],
      },
      {
        label: 'Settings',
        items: [
          { href: '/settings/profile', label: 'Profile', icon: PersonOutlinedIcon },
        ],
      },
    ],

    allowedRoutes: ALLOWED_ROUTES.platform_admin,
    permissions: {
      ...DENY_ALL,
      canViewAllCompanies:      true,
      canCreateCompany:         true,
      canEditCompany:           true,
      canDeleteCompany:         true,
      canDeactivateCompany:     true,
      canManageThemes:          true,
      canViewChannels:          true,
      canManageProviders:       true,
      canManageCredentials:     true,
      canManageDomains:         true,
      canManageEvents:          true,
      canTestNotifications:     true,
      canManageTemplates:       true,
      canUploadMedia:           true,
      canManageStorage:         true,
      canGenerateReports:       true,
      canAccessPlatformSettings:true,
      canManageUsers:           true,
      canInviteUsers:           true,
      canDeactivateUsers:       true,
      canDeleteUsers:           true,
      canTransferOwnership:     false,
      canViewAuditLogs:         true,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COMPANY OWNER — company scope, manages their own company end-to-end
  //
  // Sees the full Communication Setup workflow (DEC-016):
  //   My Company → Theme → Credentials →
  //   Domains → Templates → Events → Test Notifications
  //
  // Does NOT see: /companies (global list — platform_admin only)
  // ══════════════════════════════════════════════════════════════════════════
  company_owner: {
    role: 'company_owner',
    scope: 'company',
    landingPage: LANDING_PAGES.company_owner,
    navbarMode: 'single',
    navbar: {
      showCompanyName:     true,
      showRoleBadge:       true,
      showEnvironmentBadge:false,
      showCompanySwitcher: false,
      roleBadgeLabel:      'Owner',
    },
    sidebarTop: [
      { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
    ],
    sidebarTabs: [
      {
        key: 'setup',
        label: 'Setup',
        icon: SettingsOutlinedIcon,
        items: [
          { href: '/company',                   label: 'My Company',        icon: DomainOutlinedIcon              },
          { href: '/company/themes',            label: 'Theme',             icon: PaletteOutlinedIcon             },
          { href: '/provider-credentials',      label: 'Credentials',       icon: VpnKeyOutlinedIcon              },
          { href: '/layout-templates',          label: 'Templates',         icon: ArticleOutlinedIcon             },
          { href: '/document-domain-catalogue', label: 'Doc Domains',       icon: FolderOutlinedIcon              },
          { href: '/document-catalogue',        label: 'Documents',         icon: DescriptionOutlinedIcon         },
        ],
      },
      {
        key: 'calendar',
        label: 'Calendar',
        icon: CalendarMonthOutlinedIcon,
        requiresChannel: ['calendar'],
        items: [
          { href: '/calendar/calendars', label: 'Calendars', icon: CalendarMonthOutlinedIcon },
          { href: '/calendar/events',    label: 'Events',    icon: EventOutlinedIcon          },
        ],
      },
      {
        key: 'payments',
        label: 'Payments',
        icon: PaymentsOutlinedIcon,
        requiresChannel: ['payment'],
        items: [
          { href: '/payments',                 label: 'Dashboard',       icon: AccountBalanceOutlinedIcon          },
          { href: '/payments/payment-methods', label: 'Payment Methods', icon: CreditCardOutlinedIcon              },
          { href: '/payments/testing',         label: 'Payment Testing', icon: ScienceOutlinedIcon                 },
          { href: '/payments/payments',        label: 'Payments',        icon: PaymentsOutlinedIcon                },
          { href: '/payments/refunds',         label: 'Refunds',         icon: UndoOutlinedIcon                    },
          { href: '/payments/payouts',         label: 'Payouts',         icon: SendOutlinedIcon                    },
          { href: '/payments/webhooks',        label: 'Webhooks',        icon: WebhookOutlinedIcon                 },
          { href: '/payments/gateway',         label: 'Gateway',         icon: IntegrationInstructionsOutlinedIcon },
          { href: '/payments/settings',        label: 'Settings',        icon: SettingsOutlinedIcon                },
        ],
      },
      {
        key: 'accounting',
        label: 'Accounting',
        icon: AccountBalanceWalletOutlinedIcon,
        requiresChannel: ['accounting'],
        items: [
          { href: '/accounting/bank-connections',         label: 'Bank Connections',        icon: LinkOutlinedIcon                    },
          { href: '/accounting/bank-feed',                label: 'Bank Feed',               icon: AccountBalanceWalletOutlinedIcon    },
          { href: '/accounting/accounting-transactions',  label: 'Accounting Transactions', icon: ReceiptLongOutlinedIcon             },
          { href: '/accounting/reconciliation',           label: 'Reconciliation',          icon: CompareArrowsOutlinedIcon           },
          { href: '/accounting/manual-journals',          label: 'Manual Journals',         icon: IntegrationInstructionsOutlinedIcon },
          { href: '/accounting/general-ledger',           label: 'General Ledger',          icon: MenuBookOutlinedIcon                },
          { href: '/accounting/chart-of-accounts',        label: 'Chart of Accounts',       icon: AccountTreeOutlinedIcon             },
        ],
      },
      {
        key: 'notifications',
        label: 'Notifications',
        icon: NotificationsOutlinedIcon,
        requiresChannel: ['email', 'sms'],
        items: [
          { href: '/notifications',      label: 'Notifications',      icon: NotificationsOutlinedIcon       },
          { href: '/domain-catalogue',   label: 'Domains',            icon: AccountTreeOutlinedIcon         },
          { href: '/event-catalogue',    label: 'Events',             icon: EventOutlinedIcon               },
          { href: '/notifications/test', label: 'Test Notifications', icon: NotificationsActiveOutlinedIcon },
        ],
      },
      {
        key: 'email',
        label: 'Email',
        icon: MailOutlineOutlinedIcon,
        requiresChannel: ['email'],
        requiresProviderKey: ['gmail_oauth'],
        items: [
          { href: '/email/inbox', label: 'Inbox', icon: InboxOutlinedIcon },
        ],
      },
      {
        key: 'identity',
        label: 'Identity',
        icon: BadgeOutlinedIcon,
        requiresChannel: ['identity'],
        items: [
          { href: '/identity/documentation', label: 'Documentation', icon: MenuBookOutlinedIcon                },
        ],
      },
      {
        key: 'storage',
        label: 'Storage',
        icon: CloudOutlinedIcon,
        requiresChannel: ['storage'],
        items: [
          { href: '/storage-domain-catalogue', label: 'Storage Domains', icon: FolderOutlinedIcon },
        ],
      },
    ],
    sidebarCommon: [
      { href: '/users',            label: 'Team',    icon: GroupOutlinedIcon  },
      { href: '/settings/profile', label: 'Profile', icon: PersonOutlinedIcon },
    ],
    allowedRoutes: ALLOWED_ROUTES.company_owner,
    permissions: {
      ...DENY_ALL,
      canViewOwnCompany:    true,
      canEditCompany:        true,
      canManageThemes:       true,
      canManageCredentials:  true,
      canManageDomains:      true,
      canManageEvents:       true,
      canTestNotifications: true,
      canManageTemplates:   true,
      canUploadMedia:       true,
      canManageStorage:     true,
      canGenerateReports:   true,
      canManageUsers:       true,
      canInviteUsers:       true,
      canDeactivateUsers:   true,
      canDeleteUsers:       true,
      canTransferOwnership: true,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COMPANY ADMIN — company scope, manages operations but not ownership
  //
  // Sidebar identical to company_owner.
  // Ownership-restricted actions hidden via PermissionGuard
  // (canTransferOwnership = false, canEditCompany = false).
  // ══════════════════════════════════════════════════════════════════════════
  company_admin: {
    role: 'company_admin',
    scope: 'company',
    landingPage: LANDING_PAGES.company_admin,
    navbarMode: 'single',
    navbar: {
      showCompanyName:     true,
      showRoleBadge:       true,
      showEnvironmentBadge:false,
      showCompanySwitcher: false,
      roleBadgeLabel:      'Company Admin',
    },
    sidebarTop: [
      { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
    ],
    sidebarTabs: [
      {
        key: 'setup',
        label: 'Setup',
        icon: SettingsOutlinedIcon,
        items: [
          { href: '/company',                   label: 'My Company',        icon: DomainOutlinedIcon              },
          { href: '/company/themes',            label: 'Theme',             icon: PaletteOutlinedIcon             },
          { href: '/provider-credentials',      label: 'Credentials',       icon: VpnKeyOutlinedIcon              },
          { href: '/layout-templates',          label: 'Templates',         icon: ArticleOutlinedIcon             },
          { href: '/document-domain-catalogue', label: 'Doc Domains',       icon: FolderOutlinedIcon              },
          { href: '/document-catalogue',        label: 'Documents',         icon: DescriptionOutlinedIcon         },
        ],
      },
      {
        key: 'calendar',
        label: 'Calendar',
        icon: CalendarMonthOutlinedIcon,
        requiresChannel: ['calendar'],
        items: [
          { href: '/calendar/calendars', label: 'Calendars', icon: CalendarMonthOutlinedIcon },
          { href: '/calendar/events',    label: 'Events',    icon: EventOutlinedIcon          },
        ],
      },
      {
        key: 'payments',
        label: 'Payments',
        icon: PaymentsOutlinedIcon,
        requiresChannel: ['payment'],
        items: [
          { href: '/payments',                 label: 'Dashboard',       icon: AccountBalanceOutlinedIcon          },
          { href: '/payments/payment-methods', label: 'Payment Methods', icon: CreditCardOutlinedIcon              },
          { href: '/payments/testing',         label: 'Payment Testing', icon: ScienceOutlinedIcon                 },
          { href: '/payments/payments',        label: 'Payments',        icon: PaymentsOutlinedIcon                },
          { href: '/payments/refunds',         label: 'Refunds',         icon: UndoOutlinedIcon                    },
          { href: '/payments/payouts',         label: 'Payouts',         icon: SendOutlinedIcon                    },
          { href: '/payments/webhooks',        label: 'Webhooks',        icon: WebhookOutlinedIcon                 },
          { href: '/payments/gateway',         label: 'Gateway',         icon: IntegrationInstructionsOutlinedIcon },
          { href: '/payments/settings',        label: 'Settings',        icon: SettingsOutlinedIcon                },
        ],
      },
      {
        key: 'accounting',
        label: 'Accounting',
        icon: AccountBalanceWalletOutlinedIcon,
        requiresChannel: ['accounting'],
        items: [
          { href: '/accounting/bank-connections',         label: 'Bank Connections',        icon: LinkOutlinedIcon                    },
          { href: '/accounting/bank-feed',                label: 'Bank Feed',               icon: AccountBalanceWalletOutlinedIcon    },
          { href: '/accounting/accounting-transactions',  label: 'Accounting Transactions', icon: ReceiptLongOutlinedIcon             },
          { href: '/accounting/reconciliation',           label: 'Reconciliation',          icon: CompareArrowsOutlinedIcon           },
          { href: '/accounting/manual-journals',          label: 'Manual Journals',         icon: IntegrationInstructionsOutlinedIcon },
          { href: '/accounting/general-ledger',           label: 'General Ledger',          icon: MenuBookOutlinedIcon                },
          { href: '/accounting/chart-of-accounts',        label: 'Chart of Accounts',       icon: AccountTreeOutlinedIcon             },
        ],
      },
      {
        key: 'notifications',
        label: 'Notifications',
        icon: NotificationsOutlinedIcon,
        requiresChannel: ['email', 'sms'],
        items: [
          { href: '/notifications',      label: 'Notifications',      icon: NotificationsOutlinedIcon       },
          { href: '/domain-catalogue',   label: 'Domains',            icon: AccountTreeOutlinedIcon         },
          { href: '/event-catalogue',    label: 'Events',             icon: EventOutlinedIcon               },
          { href: '/notifications/test', label: 'Test Notifications', icon: NotificationsActiveOutlinedIcon },
        ],
      },
      {
        key: 'email',
        label: 'Email',
        icon: MailOutlineOutlinedIcon,
        requiresChannel: ['email'],
        requiresProviderKey: ['gmail_oauth'],
        items: [
          { href: '/email/inbox', label: 'Inbox', icon: InboxOutlinedIcon },
        ],
      },
      {
        key: 'identity',
        label: 'Identity',
        icon: BadgeOutlinedIcon,
        requiresChannel: ['identity'],
        items: [
          { href: '/identity/documentation', label: 'Documentation', icon: MenuBookOutlinedIcon                },
        ],
      },
      {
        key: 'storage',
        label: 'Storage',
        icon: CloudOutlinedIcon,
        requiresChannel: ['storage'],
        items: [
          { href: '/storage-domain-catalogue', label: 'Storage Domains', icon: FolderOutlinedIcon },
        ],
      },
    ],
    sidebarCommon: [
      { href: '/users',            label: 'Team',    icon: GroupOutlinedIcon  },
      { href: '/settings/profile', label: 'Profile', icon: PersonOutlinedIcon },
    ],
    allowedRoutes: ALLOWED_ROUTES.company_admin,
    permissions: {
      ...DENY_ALL,
      canViewOwnCompany:    true,
      // canEditCompany intentionally false — admin cannot change company settings
      canManageThemes:       true,
      canManageCredentials:  true,
      canManageDomains:      true,
      canManageEvents:       true,
      canTestNotifications: true,
      canManageTemplates:   true,
      canUploadMedia:       true,
      canManageStorage:     true,
      canGenerateReports:   true,
      canManageUsers:       true,
      canInviteUsers:       true,
      canDeactivateUsers:   true,
      canDeleteUsers:       false,
      canTransferOwnership: false,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATOR — company scope, executes operational tasks
  //
  // Sees: Dashboard, Test Notifications, Team, Profile
  // Does NOT see: Communication Setup, Reports, Media, Storage (DEC-016)
  // ══════════════════════════════════════════════════════════════════════════
  operator: {
    role: 'operator',
    scope: 'company',
    landingPage: LANDING_PAGES.operator,
    navbarMode: 'single',
    navbar: {
      showCompanyName:     true,
      showRoleBadge:       true,
      showEnvironmentBadge:false,
      showCompanySwitcher: false,
      roleBadgeLabel:      'Operator',
    },
    sidebarTop: [
      { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
    ],
    sidebarTabs: [],
    sidebarCommon: [
      { href: '/notifications/test', label: 'Test Notifications', icon: NotificationsActiveOutlinedIcon },
      { href: '/users',              label: 'Team',               icon: GroupOutlinedIcon                },
      { href: '/settings/profile',   label: 'Profile',            icon: PersonOutlinedIcon               },
    ],
    allowedRoutes: ALLOWED_ROUTES.operator,
    permissions: {
      ...DENY_ALL,
      canTestNotifications: true,
      canUploadMedia:       true,
      canManageStorage:     true,
      canGenerateReports:   true,
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VIEWER — company scope, read-only
  //
  // Sees: Dashboard, Team, Profile
  // Does NOT see: Communications Setup, Operations, Reports, Media (DEC-016)
  // ══════════════════════════════════════════════════════════════════════════
  viewer: {
    role: 'viewer',
    scope: 'company',
    landingPage: LANDING_PAGES.viewer,
    navbarMode: 'single',
    navbar: {
      showCompanyName:     true,
      showRoleBadge:       true,
      showEnvironmentBadge:false,
      showCompanySwitcher: false,
      roleBadgeLabel:      'Viewer',
    },
    sidebarTop: [
      { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
    ],
    sidebarTabs: [],
    sidebarCommon: [
      { href: '/users',            label: 'Team',    icon: GroupOutlinedIcon  },
      { href: '/settings/profile', label: 'Profile', icon: PersonOutlinedIcon },
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

export function getPermissions(role: UserRole): UserPermissions {
  return getRoleConfig(role).permissions;
}

export function getAdminSidebarConfig(role: UserRole): SidebarSectionConfig[] {
  return getRoleConfig(role).sidebarAdmin ?? [];
}

export function getNavbarMode(role: UserRole): NavbarMode {
  return getRoleConfig(role).navbarMode;
}
