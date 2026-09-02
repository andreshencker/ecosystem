'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GrapiflyAppShell, useGrapiflyShell } from '@/components/GrapiflyAppShell';

type Status = 'active' | 'revoked';

interface TokenEntry {
  tokenId: string; organizationId: string; name: string; description: string;
  tokenPrefix: string; status: Status; lastUsedAt: string | null; expiresAt: string | null; createdBy: string;
}

type DrawerMode = 'create' | null;

function DeleteIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function RevokeIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" /><path d="M8.5 8.5l7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

export default function IntegrationsPage() {
  return <GrapiflyAppShell><IntegrationsContent /></GrapiflyAppShell>;
}

function IntegrationsContent() {
  const { selectedOrganization } = useGrapiflyShell();
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const [tokens, setTokens] = useState<TokenEntry[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const load = useCallback((organizationId: string) => {
    setState('loading');
    return fetch(`${apiUrl}/organizations/${organizationId}/communication-tokens`, { credentials: 'include' })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { setTokens(data.tokens); setState('ready'); })
      .catch(() => setState('error'));
  }, [apiUrl]);

  useEffect(() => {
    if (selectedOrganization) load(selectedOrganization.organizationId);
  }, [selectedOrganization, load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tokens.filter(token => {
      if (statusFilter !== 'all' && token.status !== statusFilter) return false;
      if (q && !`${token.name} ${token.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tokens, query, statusFilter]);

  function openCreate() {
    setDrawerMode('create'); setName(''); setDescription(''); setExpiresAt(''); setFormError(''); setCreatedToken(null);
  }
  function closeDrawer() {
    if (saving) return;
    setDrawerMode(null); setFormError(''); setCreatedToken(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedOrganization) return;
    setFormError(''); setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/organizations/${selectedOrganization.organizationId}/communication-tokens`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, expiresAt: expiresAt || null }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? 'Could not create token');
      setCreatedToken(body.token);
      await load(selectedOrganization.organizationId);
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not create token'); }
    finally { setSaving(false); }
  }

  async function handleRevoke(token: TokenEntry) {
    if (!selectedOrganization || !window.confirm(`Revoke "${token.name}"? Any system using it will stop being able to connect.`)) return;
    try {
      const response = await fetch(`${apiUrl}/organizations/${selectedOrganization.organizationId}/communication-tokens/${token.tokenId}/revoke`, { method: 'POST', credentials: 'include' });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Could not revoke token'); }
      await load(selectedOrganization.organizationId);
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Could not revoke token'); }
  }

  async function handleDelete(token: TokenEntry) {
    if (!selectedOrganization || !window.confirm(`Permanently delete "${token.name}"?`)) return;
    try {
      const response = await fetch(`${apiUrl}/organizations/${selectedOrganization.organizationId}/communication-tokens/${token.tokenId}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Could not delete token'); }
      await load(selectedOrganization.organizationId);
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Could not delete token'); }
  }

  return <section className="organizations-page organizations-embedded"><section className="organizations-shell">
    <header className="organizations-heading"><div><span className="section-kicker">Grapifly</span><h1>Connect external<br />systems safely.</h1><p>Communication tokens let outside systems (like Business App) call into ecosystem apps on behalf of {selectedOrganization?.name ?? 'your organization'} — issued and revoked from here, verified live by Grapifly on every call.</p></div></header>

    {!selectedOrganization && <div className="organization-empty"><p>Create or select an organization to manage its integrations.</p></div>}
    {selectedOrganization && state === 'loading' && <div className="organization-empty"><p>Loading integrations…</p></div>}
    {selectedOrganization && state === 'error' && <div className="organization-empty"><p>Integrations could not be loaded.</p></div>}

    {selectedOrganization && state === 'ready' && <section className="role-panel">
      <div className="role-panel-header">
        <div><h3>Communication tokens</h3><p>{tokens.length} tokens total, {filtered.length} matching current filters</p></div>
        <button type="button" className="role-add-button" onClick={openCreate}>+ New token</button>
      </div>

      <div className="role-filters">
        <label className="role-filter-field"><span>Status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as any)}>
          <option value="all">All</option><option value="active">Active</option><option value="revoked">Revoked</option>
        </select></label>
        <label className="role-filter-field role-filter-search"><span>Search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search token" /></label>
      </div>

      <div className="users-table-wrap"><table className="users-table app-table"><thead><tr><th>Token</th><th>Status</th><th>Last used</th><th></th></tr></thead><tbody>
        {filtered.map(token => <tr key={token.tokenId}>
          <td><div className="app-row-identity"><span className="app-swatch" style={{ background: '#efeaff', color: '#5c47ce' }}>{token.name[0]}</span><div><strong>{token.name}</strong><small>{token.tokenPrefix}…</small></div></div></td>
          <td><span className={`status-badge ${token.status === 'active' ? 'active' : 'inactive'}`}>{token.status}</span></td>
          <td>{token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}</td>
          <td><div className="role-row-actions">
            {token.status === 'active' && <button type="button" title="Revoke token" aria-label="Revoke token" onClick={() => handleRevoke(token)}><RevokeIcon /></button>}
            <button type="button" className="danger" title="Delete token" aria-label="Delete token" onClick={() => handleDelete(token)}><DeleteIcon /></button>
          </div></td>
        </tr>)}
      </tbody></table>
      {filtered.length === 0 && <div className="organization-empty"><p>{tokens.length === 0 ? 'No communication tokens yet.' : 'No tokens match your filters.'}</p></div>}
      </div>
    </section>}

    {drawerMode && <div className="drawer-overlay" onClick={closeDrawer}><aside className="drawer" onClick={event => event.stopPropagation()}>
      {createdToken ? <>
        <header className="drawer-header"><div><h3>Token created</h3><p>Save this token now — it won&apos;t be shown again.</p></div><button type="button" className="drawer-close" onClick={closeDrawer}>×</button></header>
        <div className="drawer-body">
          <div className="drawer-field"><span>Communication token</span><code className="app-secret-value">{createdToken}</code></div>
          <p className="app-secret-hint">This is what an external system (like Business App) pastes into its own settings to connect to {selectedOrganization?.name}. Grapifly only keeps a hash of it, so it cannot be retrieved again — you would need to create a new one.</p>
        </div>
        <footer className="drawer-footer"><button type="button" onClick={closeDrawer}>Done</button></footer>
      </> : <>
        <header className="drawer-header"><div><h3>New communication token</h3><p>Grants an external system access to {selectedOrganization?.name}.</p></div><button type="button" className="drawer-close" onClick={closeDrawer}>×</button></header>
        <form className="drawer-body" onSubmit={handleSubmit} id="token-form">
          {formError && <div className="drawer-error">{formError}</div>}
          <label className="drawer-field"><span>Name</span><input value={name} onChange={event => setName(event.target.value)} placeholder="Business App - Production" required /></label>
          <label className="drawer-field"><span>Description</span><input value={description} onChange={event => setDescription(event.target.value)} placeholder="Optional" /></label>
          <label className="drawer-field"><span>Expires</span><input type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} /></label>
        </form>
        <footer className="drawer-footer"><button type="button" onClick={closeDrawer} disabled={saving}>Cancel</button><button type="submit" form="token-form" disabled={saving}>{saving ? 'Creating…' : 'Create token'}</button></footer>
      </>}
    </aside></div>}
  </section></section>;
}
