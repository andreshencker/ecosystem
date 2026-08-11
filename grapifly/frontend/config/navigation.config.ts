export type GrapiflyCapability =
  | 'account.view'
  | 'organizations.view'
  | 'organization.members.manage'
  | 'organization.applications.manage'
  | 'organization.invitations.manage'
  | 'platform.users.view'
  | 'platform.applications.view'
  | 'platform.access.view';

export interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  requiredCapability: GrapiflyCapability;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

/**
 * Single source of truth for Grapifly navigation.
 * Roles are resolved by the backend/context layer into capabilities; UI components
 * only render the entries the active identity and organization can use.
 */
export const GRAPIFLY_NAVIGATION: NavigationSection[] = [
  {
    label: 'Personal',
    items: [
      { label: 'Home', href: '/home', icon: '⌂', requiredCapability: 'account.view' },
      { label: 'Organizations', href: '/organizations', icon: '◉', requiredCapability: 'organizations.view' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Members', href: '/organizations?view=members', icon: '♙', requiredCapability: 'organization.members.manage' },
      { label: 'Applications', href: '/organizations?view=applications', icon: '◇', requiredCapability: 'organization.applications.manage' },
      { label: 'Invitations', href: '/organizations?view=invitations', icon: '✉', requiredCapability: 'organization.invitations.manage' },
    ],
  },
  {
    label: 'Platform administration',
    items: [
      { label: 'Users', href: '/admin/users', icon: '◎', requiredCapability: 'platform.users.view' },
      { label: 'App catalogue', href: '/admin/applications', icon: '◆', requiredCapability: 'platform.applications.view' },
      { label: 'Access', href: '/admin/access', icon: '⌘', requiredCapability: 'platform.access.view' },
    ],
  },
];

export function getVisibleNavigation(capabilities: ReadonlySet<GrapiflyCapability>) {
  return GRAPIFLY_NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => capabilities.has(item.requiredCapability)),
  })).filter((section) => section.items.length > 0);
}
