'use client';

import { useEffect, useRef, useState } from 'react';

interface ThemePalette { primaryColor: string; textColor: string }
interface Theme { icon: string; logoUrl: string | null; light: ThemePalette }
interface EnabledApp { key: string; name: string; launchUrl: string; theme: Theme }

function WaffleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      {[0, 1, 2].flatMap(row => [0, 1, 2].map(col => (
        <circle key={`${row}-${col}`} cx={3 + col * 7} cy={3 + row * 7} r="1.6" />
      )))}
    </svg>
  );
}

export function AppSwitcher({ organizationId }: { organizationId: string | null }) {
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<EnabledApp[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !organizationId) return;
    setState('loading');
    fetch(`${apiUrl}/organizations/${organizationId}/my-apps`, { credentials: 'include' })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { setApps(data.applications); setState('ready'); })
      .catch(() => setState('error'));
  }, [open, organizationId, apiUrl]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="app-switcher" ref={rootRef}>
      <button type="button" className="app-switcher-trigger" onClick={() => setOpen(current => !current)} aria-haspopup="menu" aria-expanded={open} aria-label="Switch apps" title="Switch apps">
        <WaffleIcon />
      </button>
      {open && (
        <div className="app-switcher-panel" role="menu">
          {state === 'loading' && <div className="app-switcher-message">Loading apps…</div>}
          {state === 'error' && <div className="app-switcher-message">Apps could not be loaded.</div>}
          {state === 'ready' && apps.length === 0 && <div className="app-switcher-message">No apps enabled yet.</div>}
          {state === 'ready' && apps.length > 0 && (
            <div className="app-switcher-grid">
              {apps.map(app => (
                <a key={app.key} className="app-switcher-tile" href={app.launchUrl} onClick={() => setOpen(false)}>
                  <span className="app-switcher-tile-icon" style={{ background: app.theme.light.primaryColor, color: app.theme.light.textColor }}>
                    {app.theme.logoUrl ? <img src={app.theme.logoUrl} alt="" /> : (app.theme.icon || app.name[0])}
                  </span>
                  <span>{app.name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
