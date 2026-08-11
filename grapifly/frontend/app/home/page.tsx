'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';

interface User { grapiflyUserId: string; displayName: string; email: string; avatarUrl: string | null }

const apps = [
  { name: 'JTrade', description: 'Trading and investment', glyph: '↗', tone: 'violet', url: process.env.NEXT_PUBLIC_JTRADE_URL ?? 'http://localhost:5173' },
  { name: 'Business', description: 'Business operations', glyph: 'B', tone: 'blue', url: process.env.NEXT_PUBLIC_BUSINESS_URL ?? 'http://localhost:3003' },
  { name: 'Communications', description: 'Messages and notifications', glyph: '✦', tone: 'orange', url: process.env.NEXT_PUBLIC_COMMUNICATIONS_URL ?? 'http://localhost:3000' },
];

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [failed, setFailed] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';

  useEffect(() => {
    fetch(`${apiUrl}/auth/me`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setUser)
      .catch(() => setFailed(true));
  }, [apiUrl]);

  async function logout() {
    await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    window.location.replace('/');
  }

  if (failed) {
    window.location.replace('/');
    return null;
  }

  return (
    <main className="portal">
      <nav className="nav shell">
        <a className="brand" href="/"><BrandMark /> Grapifly</a>
        <button className="logout-button" onClick={logout}>Sign out</button>
      </nav>
      <section className="portal-shell shell">
        <header className="welcome">
          <div>{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <div className="avatar-placeholder">{user?.displayName?.[0] ?? 'G'}</div>}</div>
          <div><span className="section-kicker">Your Grapifly</span><h1>{user ? `Welcome, ${user.displayName.split(' ')[0]}.` : 'Welcome.'}</h1><p>{user?.email ?? 'Preparing your account…'}</p></div>
        </header>
        <div className="portal-heading"><div><h2>Your apps</h2><p>Everything connected to your Grapifly ID.</p></div><button className="manage-button">Manage access</button></div>
        <div className="app-grid">
          {apps.map((app) => <a className="app-tile" href={app.url} key={app.name}><div className={`app-icon ${app.tone}`}>{app.glyph}</div><div><h3>{app.name}</h3><p>{app.description}</p></div><span>Open&nbsp; ↗</span></a>)}
        </div>
        <div className="account-card"><div><span className="section-kicker">Grapifly ID</span><h3>Your account, safe and up to date.</h3><p>Review your identity, connected organizations and active sessions.</p></div><button>Account settings</button></div>
      </section>
    </main>
  );
}
