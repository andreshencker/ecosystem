'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BrandMark } from './BrandMark';
import { getVisibleNavigation, GrapiflyCapability } from '@/config/navigation.config';

interface ShellUser { grapiflyUserId: string; displayName: string; email: string; avatarUrl: string | null }
interface ShellOrganization { organizationId: string; name: string; membership: { role: 'owner' | 'admin' | 'member' } }
interface ShellContextValue { user: ShellUser | null; organizations: ShellOrganization[]; selectedOrganization: ShellOrganization | null; isPlatformAdmin: boolean }

const ShellContext = createContext<ShellContextValue>({ user: null, organizations: [], selectedOrganization: null, isPlatformAdmin: false });
export const useGrapiflyShell = () => useContext(ShellContext);

export function GrapiflyAppShell({ children }: { children: ReactNode }) {
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const pathname = usePathname();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [user, setUser] = useState<ShellUser | null>(null);
  const [organizations, setOrganizations] = useState<ShellOrganization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${apiUrl}/auth/me`, { credentials: 'include' }),
      fetch(`${apiUrl}/organizations`, { credentials: 'include' }),
      fetch(`${apiUrl}/admin/me`, { credentials: 'include' }),
    ]).then(async ([identityResponse, organizationsResponse, adminResponse]) => {
      if (!identityResponse.ok) { window.location.replace('/'); return; }
      const [identity, organizationData] = await Promise.all([
        identityResponse.json(),
        organizationsResponse.ok ? organizationsResponse.json() : Promise.resolve({ organizations: [] }),
      ]);
      setUser(identity);
      setOrganizations(organizationData.organizations);
      setIsPlatformAdmin(adminResponse.ok);
      const remembered = window.localStorage.getItem('grapifly_active_organization');
      const selected = organizationData.organizations.some((organization: ShellOrganization) => organization.organizationId === remembered)
        ? remembered
        : organizationData.organizations[0]?.organizationId ?? '';
      setSelectedOrganizationId(selected);
      if (selected) window.localStorage.setItem('grapifly_active_organization', selected);
    }).catch(() => window.location.replace('/'));
  }, [apiUrl]);

  useEffect(() => {
    setActiveView(new URLSearchParams(window.location.search).get('view'));
  }, [pathname]);

  const selectedOrganization = organizations.find((organization) => organization.organizationId === selectedOrganizationId) ?? null;
  const capabilities = useMemo(() => {
    const result = new Set<GrapiflyCapability>(['account.view', 'organizations.view']);
    if (selectedOrganization && ['owner', 'admin'].includes(selectedOrganization.membership.role)) {
      result.add('organization.members.manage');
      result.add('organization.applications.manage');
      result.add('organization.invitations.manage');
    }
    if (isPlatformAdmin) {
      result.add('platform.users.view');
      result.add('platform.applications.view');
      result.add('platform.access.view');
    }
    return result;
  }, [isPlatformAdmin, selectedOrganization]);
  const navigation = useMemo(() => getVisibleNavigation(capabilities), [capabilities]);

  async function logout() {
    await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    window.location.replace('/');
  }

  return <ShellContext.Provider value={{ user, organizations, selectedOrganization, isPlatformAdmin }}>
    <main className="grapifly-shell">
      <aside className={`grapifly-sidebar ${menuOpen ? 'open' : ''}`}>
        <a className="brand" href="/home"><BrandMark /> Grapifly</a>
        <div className="grapifly-context">
          <label>Organization</label>
          {organizations.length > 0 ? <select value={selectedOrganizationId} onChange={(event) => { setSelectedOrganizationId(event.target.value); window.localStorage.setItem('grapifly_active_organization', event.target.value); }}>
            {organizations.map((organization) => <option key={organization.organizationId} value={organization.organizationId}>{organization.name}</option>)}
          </select> : <a href="/organizations">+ Create organization</a>}
          {selectedOrganization && <small>{selectedOrganization.membership.role}</small>}
        </div>
        <nav>{navigation.map((section) => <section key={section.label}><span>{section.label}</span>{section.items.map((item) => {
          const [itemPath, itemQuery] = item.href.split('?');
          const requestedView = itemQuery ? new URLSearchParams(itemQuery).get('view') : null;
          const active = requestedView
            ? pathname === itemPath && activeView === requestedView
            : (pathname === itemPath && !activeView) || (itemPath !== '/home' && pathname.startsWith(`${itemPath}/`));
          return <a key={`${section.label}-${item.label}`} className={active ? 'active' : ''} href={item.href} onClick={() => setMenuOpen(false)}><i>{item.icon}</i>{item.label}</a>;
        })}</section>)}</nav>
        <button className="shell-signout" onClick={logout}>Sign out</button>
      </aside>
      <section className="grapifly-workspace">
        <header className="grapifly-topbar"><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation">☰</button><div><span>{selectedOrganization?.name ?? 'Personal'}</span><small>Grapifly ecosystem</small></div><div className="shell-profile">{user?.avatarUrl ? <img src={user.avatarUrl} alt=""/> : <span>{user?.displayName?.[0] ?? 'G'}</span>}<div><strong>{user?.displayName ?? 'Grapifly'}</strong><small>{user?.email ?? 'Loading identity…'}</small></div></div></header>
        <div className="grapifly-page-content">{children}</div>
      </section>
    </main>
  </ShellContext.Provider>;
}
