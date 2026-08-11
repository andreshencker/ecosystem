'use client';

import { GrapiflyAppShell, useGrapiflyShell } from '@/components/GrapiflyAppShell';
import { RelayMark } from '@/components/RelayMark';

const apps = [
  { name: 'JTrade', description: 'Trading and investment', glyph: '↗', tone: 'violet', url: process.env.NEXT_PUBLIC_JTRADE_URL ?? 'http://localhost:5173' },
  { name: 'Business', description: 'Business operations', glyph: 'B', tone: 'blue', url: process.env.NEXT_PUBLIC_BUSINESS_URL ?? 'http://localhost:3003' },
  { name: 'Relay', description: 'Connections and automation', glyph: '✦', tone: 'orange', logo: 'relay', url: process.env.NEXT_PUBLIC_COMMUNICATIONS_URL ?? 'http://localhost:3000', learnMore: '/apps/relay' },
];

export default function HomePage() {
  return <GrapiflyAppShell><HomeContent /></GrapiflyAppShell>;
}

function HomeContent() {
  const { user } = useGrapiflyShell();
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const relaySsoUrl = `${apiUrl}/auth/sso/relay`;

  return (
    <section className="portal portal-embedded">
      <div className="portal-shell">
        <header className="welcome">
          <div>{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <div className="avatar-placeholder">{user?.displayName?.[0] ?? 'G'}</div>}</div>
          <div><span className="section-kicker">Your Grapifly</span><h1>{user ? `Welcome, ${user.displayName.split(' ')[0]}.` : 'Welcome.'}</h1><p>{user?.email ?? 'Preparing your account…'}</p></div>
        </header>
        <div className="portal-heading"><div><h2>Your apps</h2><p>Everything connected to your Grapifly ID.</p></div><a className="manage-button" href="/organizations">Manage organizations</a></div>
        <div className="app-grid">
          {apps.map((app) => (
            <article className="app-tile" key={app.name}>
              <div className={`app-icon ${app.tone}`}>{app.logo === 'relay' ? <RelayMark /> : app.glyph}</div>
              <div><h3>{app.name}</h3><p>{app.description}</p></div>
              <div className="app-actions">
                {app.learnMore && <a className="learn-link" href={app.learnMore}>Learn more</a>}
                <a href={app.name === 'Relay' ? relaySsoUrl : app.url}>Open&nbsp; ↗</a>
              </div>
            </article>
          ))}
        </div>
        <div className="account-card"><div><span className="section-kicker">Grapifly ID</span><h3>Your account, safe and up to date.</h3><p>Review your identity, connected organizations and active sessions.</p></div><button>Account settings</button></div>
      </div>
    </section>
  );
}
