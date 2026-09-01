export type GrapiflyCapability =
  | 'account.view'
  | 'organizations.view'
  | 'organization.members.manage'
  | 'organization.applications.manage'
  | 'organization.invitations.manage'
  | 'platform.users.view'
  | 'platform.organizations.view'
  | 'platform.applications.view'
  | 'platform.access.view'
  | 'platform.roles.view';

export type NavigationMode = 'app' | 'admin';

export interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  requiredCapability: GrapiflyCapability;
}

export interface NavigationSection {
  label: string;
  mode: NavigationMode;
  items: NavigationItem[];
}

/**
 * Single source of truth for Grapifly navigation.
 * Roles are resolved by the backend/context layer into capabilities; UI components
 * only render the entries the active identity and organization can use.
 * `mode` groups sections under the sidebar's App/Admin tab switcher.
 */
export const GRAPIFLY_NAVIGATION: NavigationSection[] = [
  {
    label: 'Personal',
    mode: 'app',
    items: [
      { label: 'Home', href: '/home', icon: '⌂', requiredCapability: 'account.view' },
      { label: 'My organization', href: '/organizations', icon: '◉', requiredCapability: 'organizations.view' },
      { label: 'Teams', href: '/teams', icon: '☺', requiredCapability: 'organizations.view' },
      { label: 'My apps', href: '/my-apps', icon: '▤', requiredCapability: 'organizations.view' },
      { label: 'Integrations', href: '/integrations', icon: '⌁', requiredCapability: 'organizations.view' },
    ],
  },
  {
    label: 'Platform administration',
    mode: 'admin',
    items: [
      { label: 'Users', href: '/admin/users', icon: '◎', requiredCapability: 'platform.users.view' },
      { label: 'Organizations', href: '/admin/organizations', icon: '▣', requiredCapability: 'platform.organizations.view' },
      { label: 'App catalogue', href: '/admin/applications', icon: '◆', requiredCapability: 'platform.applications.view' },
      { label: 'Access', href: '/admin/access', icon: '⌘', requiredCapability: 'platform.access.view' },
      { label: 'Roles', href: '/admin/roles', icon: '⚑', requiredCapability: 'platform.roles.view' },
    ],
  },
];

export function getVisibleNavigation(capabilities: ReadonlySet<GrapiflyCapability>) {
  return GRAPIFLY_NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => capabilities.has(item.requiredCapability)),
  })).filter((section) => section.items.length > 0);
}
