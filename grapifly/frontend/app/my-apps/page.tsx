'use client';

import { useCallback, useEffect, useState } from 'react';
import { GrapiflyAppShell, useGrapiflyShell } from '@/components/GrapiflyAppShell';

interface ThemePalette { primaryColor: string; backgroundColor: string; textColor: string }
interface Theme { icon: string; logoUrl: string | null; light: ThemePalette; dark: ThemePalette }
interface EnabledApp {
  key: string; name: string; description: string; launchUrl: string; theme: Theme;
  tier: 'trial' | 'free' | 'paid';
  memberRole: string | null; memberStatus: 'active' | 'suspended' | 'revoked' | 'inactive';
}

export default function MyAppsPage() {
  return <GrapiflyAppShell><MyAppsContent /></GrapiflyAppShell>;
}

function MyAppsContent() {
  const { selectedOrganization } = useGrapiflyShell();
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const [apps, setApps] = useState<EnabledApp[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback((organizationId: string) => {
    setState('loading');
    return fetch(`${apiUrl}/organizations/${organizationId}/my-apps`, { credentials: 'include' })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { setApps(data.applications); setState('ready'); })
      .catch(() => setState('error'));
  }, [apiUrl]);

  useEffect(() => {
    if (selectedOrganization) load(selectedOrganization.organizationId);
  }, [selectedOrganization, load]);

  return <section className="organizations-page organizations-embedded"><section className="organizations-shell">
    <header className="organizations-heading"><div><span className="section-kicker">Grapifly Apps</span><h1>Your apps.<br />One click away.</h1><p>Everything enabled for {selectedOrganization?.name ?? 'your organization'}.</p></div></header>

    {!selectedOrganization && <div className="organization-empty"><h2>No organization selected</h2><p>Create or select an organization to see its apps.</p></div>}
    {selectedOrganization && state === 'loading' && <div className="organization-empty"><p>Loading apps…</p></div>}
    {selectedOrganization && state === 'error' && <div className="organization-empty"><p>Your apps could not be loaded.</p></div>}
    {selectedOrganization && state === 'ready' && apps.length === 0 && <div className="organization-empty"><h2>No apps enabled yet</h2><p>Ask an organization owner or admin to enable an app.</p></div>}

    {selectedOrganization && state === 'ready' && apps.length > 0 && <div className="my-apps-grid">
      {apps.map(app => <article key={app.key} className="my-apps-card" style={{ background: app.theme.light.backgroundColor }}>
        <div className="my-apps-card-top">
          <span className="my-apps-icon" style={{ color: app.theme.light.primaryColor }}>{app.theme.logoUrl ? <img src={app.theme.logoUrl} alt="" /> : (app.theme.icon || app.name[0])}</span>
          <span className="status-badge active">{app.tier}</span>
        </div>
        <div><h3>{app.name}</h3><p>{app.description}</p></div>
        <footer><a href={app.launchUrl} style={{ color: app.theme.light.primaryColor }}>Open ↗</a></footer>
      </article>)}
    </div>}
  </section></section>;
}
