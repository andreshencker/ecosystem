'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/AdminSidebar';

interface ThemePalette { primaryColor: string; backgroundColor: string; textColor: string }
interface Theme { icon: string; logoUrl: string | null; fontFamily: string | null; light: ThemePalette; dark: ThemePalette }
interface DefaultAccess { autoGrantOnSignup: boolean; tier: 'trial' | 'free' | 'paid'; requiresApproval: boolean }
interface CountryRestriction { enabled: boolean; countries: string[] }
type Flow = 'client' | 'provider' | 'internal';
type Ownership = 'first_party' | 'third_party';
type Status = 'active' | 'inactive';

interface AppEntry {
  key: string; name: string; description: string; launchUrl: string; ssoCallbackUrl: string | null;
  ownership: Ownership; status: Status; displayOrder: number;
  theme: Theme; defaultAccess: DefaultAccess; countryRestriction: CountryRestriction; allowedFlows: Flow[];
}

type DrawerMode = 'create' | 'edit' | null;

const DEFAULT_THEME: Theme = { icon: '', logoUrl: null, fontFamily: null, light: { primaryColor: '#5c47ce', backgroundColor: '#efeaff', textColor: '#111116' }, dark: { primaryColor: '#8f7dff', backgroundColor: '#17151f', textColor: '#f5f4fa' } };
const DEFAULT_ACCESS: DefaultAccess = { autoGrantOnSignup: false, tier: 'free', requiresApproval: false };
const DEFAULT_COUNTRY_RESTRICTION: CountryRestriction = { enabled: false, countries: [] };
const ALL_FLOWS: Flow[] = ['client', 'provider', 'internal'];

interface FormState {
  key: string; name: string; description: string; launchUrl: string; ssoCallbackUrl: string;
  ownership: Ownership; status: Status; displayOrder: string;
  theme: Theme; defaultAccess: DefaultAccess; countryRestriction: CountryRestriction; countriesText: string; allowedFlows: Flow[];
}

function emptyForm(): FormState {
  return { key: '', name: '', description: '', launchUrl: '', ssoCallbackUrl: '', ownership: 'first_party', status: 'active', displayOrder: '', theme: DEFAULT_THEME, defaultAccess: DEFAULT_ACCESS, countryRestriction: DEFAULT_COUNTRY_RESTRICTION, countriesText: '', allowedFlows: [...ALL_FLOWS] };
}

function formFromApp(app: AppEntry): FormState {
  return {
    key: app.key, name: app.name, description: app.description, launchUrl: app.launchUrl, ssoCallbackUrl: app.ssoCallbackUrl ?? '',
    ownership: app.ownership, status: app.status, displayOrder: String(app.displayOrder),
    theme: app.theme, defaultAccess: app.defaultAccess, countryRestriction: app.countryRestriction,
    countriesText: app.countryRestriction.countries.join(', '), allowedFlows: app.allowedFlows,
  };
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="drawer-field"><span>{label}</span><div className="color-input-group">
    <input type="color" value={HEX_COLOR_RE.test(value) ? value : '#000000'} onChange={event => onChange(event.target.value)} />
    <input type="text" value={value} onChange={event => onChange(event.target.value)} />
  </div></label>;
}

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.474 5.408 18.592 7.53M4 20l.688-3.44a2 2 0 0 1 .551-1.03l9.9-9.9a1.5 1.5 0 0 1 2.122 0l1.61 1.61a1.5 1.5 0 0 1 0 2.122l-9.9 9.9a2 2 0 0 1-1.03.55L4 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function DeleteIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function ApplicationsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | Ownership>('all');

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerApp, setDrawerApp] = useState<AppEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('url');

  const load = useCallback(() => {
    return fetch(`${apiUrl}/admin/applications`, { credentials: 'include' }).then(async response => {
      if (response.status === 401) { window.location.replace('/'); return null; }
      if (response.status === 403) { setState('forbidden'); return null; }
      if (!response.ok) throw new Error();
      return response.json();
    }).then(data => { if (data) { setApps(data.applications); setState('ready'); } }).catch(() => setState('error'));
  }, [apiUrl]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return apps.filter(app => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (ownershipFilter !== 'all' && app.ownership !== ownershipFilter) return false;
      if (q && !`${app.key} ${app.name} ${app.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [apps, query, statusFilter, ownershipFilter]);

  function openCreate() {
    setDrawerMode('create'); setDrawerApp(null); setForm(emptyForm()); setFormError(''); setCreatedSecret(null); setLogoMode('url');
  }
  function openEdit(app: AppEntry) {
    setDrawerMode('edit'); setDrawerApp(app); setForm(formFromApp(app)); setFormError(''); setCreatedSecret(null); setLogoMode(app.theme.logoUrl ? 'url' : 'upload');
  }
  function closeDrawer() {
    if (saving) return;
    setDrawerMode(null); setDrawerApp(null); setFormError(''); setCreatedSecret(null);
  }

  function toggleFlow(flow: Flow) {
    setForm(current => ({ ...current, allowedFlows: current.allowedFlows.includes(flow) ? current.allowedFlows.filter(f => f !== flow) : [...current.allowedFlows, flow] }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(''); setSaving(true);
    const countries = form.countriesText.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    const payload = {
      name: form.name, description: form.description, launchUrl: form.launchUrl, ssoCallbackUrl: form.ssoCallbackUrl.trim() || null,
      ownership: form.ownership, status: form.status,
      displayOrder: form.displayOrder.trim() ? Number(form.displayOrder) : undefined,
      theme: form.theme,
      defaultAccess: form.defaultAccess,
      countryRestriction: { enabled: form.countryRestriction.enabled, countries },
      allowedFlows: form.allowedFlows,
    };
    try {
      if (drawerMode === 'create') {
        const response = await fetch(`${apiUrl}/admin/applications`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: form.key, ...payload }) });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message ?? 'Could not create application');
        setCreatedSecret(body.serviceSecret);
        await load();
      } else if (drawerMode === 'edit' && drawerApp) {
        const response = await fetch(`${apiUrl}/admin/applications/${drawerApp.key}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Could not update application'); }
        setDrawerMode(null); setDrawerApp(null);
        await load();
      }
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not save application'); }
    finally { setSaving(false); }
  }

  async function handleLogoUpload(file: File) {
    if (!drawerApp) return;
    setUploadingLogo(true); setFormError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`${apiUrl}/admin/applications/${drawerApp.key}/logo`, { method: 'POST', credentials: 'include', body });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? 'Could not upload logo');
      setForm(current => ({ ...current, theme: { ...current.theme, logoUrl: result.theme.logoUrl } }));
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not upload logo'); }
    finally { setUploadingLogo(false); }
  }

  async function handleDelete(app: AppEntry) {
    if (!window.confirm(`Delete application "${app.name}" (${app.key})? This cannot be undone.`)) return;
    try {
      const response = await fetch(`${apiUrl}/admin/applications/${app.key}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Could not delete application'); }
      await load();
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Could not delete application'); }
  }

  return <main className="employee-page"><AdminSidebar active="applications" /><section className="employee-content">
    <header className="employee-topbar"><div><span className="section-kicker">Grapifly Administration</span><h1>Applications</h1></div><div className="admin-pill"><span>G</span><div><strong>Super Admin</strong><small>grapiflydeveloper@gmail.com</small></div></div></header>
    <section className="catalogue-hero"><span>ECOSYSTEM CATALOGUE</span><h2>One ecosystem.<br />Multiple solutions.</h2><p>This catalogue is the single source of truth for every application connected to a Grapifly ID — identity, access rules and brand theme, all managed from here.</p></section>

    {state === 'loading' && <div className="employee-message">Loading application catalogue…</div>}
    {state === 'forbidden' && <div className="employee-message"><strong>Administration access required.</strong></div>}
    {state === 'error' && <div className="employee-message">The application catalogue could not be loaded.</div>}

    {state === 'ready' && <section className="role-panel">
      <div className="role-panel-header">
        <div><h3>Registered applications</h3><p>{apps.length} apps total, {filtered.length} matching current filters</p></div>
        <button type="button" className="role-add-button" onClick={openCreate}>+ New application</button>
      </div>

      <div className="role-filters">
        <label className="role-filter-field"><span>Status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as any)}>
          <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select></label>
        <label className="role-filter-field"><span>Ownership</span><select value={ownershipFilter} onChange={event => setOwnershipFilter(event.target.value as any)}>
          <option value="all">All</option><option value="first_party">Grapifly app</option><option value="third_party">Third-party app</option>
        </select></label>
        <label className="role-filter-field role-filter-search"><span>Search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search application" /></label>
      </div>

      <div className="users-table-wrap"><table className="users-table app-table"><thead><tr><th>Application</th><th>Status</th><th>Ownership</th><th></th></tr></thead><tbody>
        {filtered.map(app => <tr key={app.key}>
          <td><div className="app-row-identity"><span className="app-swatch" style={{ background: app.theme.light.backgroundColor, color: app.theme.light.primaryColor }}>{app.theme.icon || app.name[0]}</span><div><strong>{app.name}</strong><small>{app.key}</small></div></div></td>
          <td><span className={`status-badge ${app.status}`}>{app.status}</span></td>
          <td>{app.ownership === 'first_party' ? 'Grapifly app' : 'Third-party app'}</td>
          <td><div className="role-row-actions"><button type="button" title="Edit application" aria-label="Edit application" onClick={() => openEdit(app)}><EditIcon /></button><button type="button" className="danger" title="Delete application" aria-label="Delete application" onClick={() => handleDelete(app)}><DeleteIcon /></button></div></td>
        </tr>)}
      </tbody></table>
      {filtered.length === 0 && <div className="employee-message">{apps.length === 0 ? 'No applications registered yet.' : 'No applications match your filters.'}</div>}
      </div>
    </section>}

    {drawerMode && <div className="drawer-overlay" onClick={closeDrawer}><aside className="drawer" onClick={event => event.stopPropagation()}>
      {createdSecret ? <>
        <header className="drawer-header"><div><h3>Application created</h3><p>Save this secret now — it won&apos;t be shown again.</p></div><button type="button" className="drawer-close" onClick={closeDrawer}>×</button></header>
        <div className="drawer-body">
          <div className="drawer-field"><span>Service secret</span><code className="app-secret-value">{createdSecret}</code></div>
          <p className="app-secret-hint">This is the shared secret {form.name || 'this app'} uses to authenticate service-to-service calls into Grapifly. Store it securely — Grapifly only keeps a hash of it, so it cannot be retrieved again.</p>
        </div>
        <footer className="drawer-footer"><button type="button" onClick={closeDrawer}>Done</button></footer>
      </> : <>
        <header className="drawer-header"><div><h3>{drawerMode === 'create' ? 'Register application' : `Edit ${drawerApp?.name}`}</h3><p>{drawerMode === 'create' ? 'Added to the shared catalogue — becomes available across the ecosystem immediately.' : `Key: ${drawerApp?.key}`}</p></div><button type="button" className="drawer-close" onClick={closeDrawer}>×</button></header>
        <form className="drawer-body" onSubmit={handleSubmit} id="app-form">
          {formError && <div className="drawer-error">{formError}</div>}

          <h4 className="drawer-section-title">Identity</h4>
          {drawerMode === 'create' && <label className="drawer-field"><span>Key</span><input value={form.key} onChange={event => setForm({ ...form, key: event.target.value })} placeholder="app_key" required /></label>}
          <label className="drawer-field"><span>Name</span><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Application name" required /></label>
          <label className="drawer-field"><span>Description</span><input value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Description" required /></label>
          <label className="drawer-field"><span>Launch URL</span><input value={form.launchUrl} onChange={event => setForm({ ...form, launchUrl: event.target.value })} placeholder="https://" required /></label>
          <label className="drawer-field"><span>SSO callback URL</span><input value={form.ssoCallbackUrl} onChange={event => setForm({ ...form, ssoCallbackUrl: event.target.value })} placeholder="https://your-app.com/auth/grapifly/callback" /></label>
          <div className="drawer-field-row">
            <label className="drawer-field"><span>Ownership</span><select value={form.ownership} onChange={event => setForm({ ...form, ownership: event.target.value as Ownership })}><option value="first_party">Grapifly app</option><option value="third_party">Third-party app</option></select></label>
            <label className="drawer-field"><span>Status</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as Status })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          </div>
          <label className="drawer-field"><span>Display order</span><input type="number" min={0} value={form.displayOrder} onChange={event => setForm({ ...form, displayOrder: event.target.value })} placeholder="auto" /></label>

          <h4 className="drawer-section-title">Theme</h4>
          <div className="drawer-field-row">
            <label className="drawer-field"><span>Icon</span><input value={form.theme.icon} onChange={event => setForm({ ...form, theme: { ...form.theme, icon: event.target.value } })} placeholder="🧩" /></label>
            <label className="drawer-field"><span>Font family</span><input value={form.theme.fontFamily ?? ''} onChange={event => setForm({ ...form, theme: { ...form.theme, fontFamily: event.target.value || null } })} placeholder="Inherit default" /></label>
          </div>
          <div className="logo-section">
            <span className="drawer-subsection-title">Logo</span>
            <div className="logo-preview-large">{form.theme.logoUrl
              ? <img src={form.theme.logoUrl} alt="" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} onLoad={event => { event.currentTarget.style.visibility = 'visible'; }} />
              : <span>{form.theme.icon || '?'}</span>}</div>

            <div className="logo-mode-toggle">
              <button type="button" className={logoMode === 'upload' ? 'active' : ''} disabled={drawerMode === 'create'} onClick={() => setLogoMode('upload')}>Upload</button>
              <button type="button" className={logoMode === 'url' ? 'active' : ''} onClick={() => setLogoMode('url')}>URL</button>
            </div>

            {logoMode === 'upload' ? (
              drawerMode === 'edit' ? <>
                <label className="logo-upload-dropzone">
                  {uploadingLogo ? 'Uploading…' : 'Choose an image…'}
                  <input type="file" accept="image/*" hidden disabled={uploadingLogo} onChange={event => { const file = event.target.files?.[0]; if (file) handleLogoUpload(file); event.target.value = ''; }} />
                </label>
              </> : <small className="drawer-field-hint">Save the application first to enable image upload.</small>
            ) : (
              <input value={form.theme.logoUrl ?? ''} onChange={event => setForm({ ...form, theme: { ...form.theme, logoUrl: event.target.value || null } })} placeholder="https://" />
            )}
          </div>
          <div className="theme-palette-group">
            <span className="drawer-subsection-title">Light palette</span>
            <div className="drawer-field-row theme-palette-row">
              <ColorField label="Primary" value={form.theme.light.primaryColor} onChange={value => setForm({ ...form, theme: { ...form.theme, light: { ...form.theme.light, primaryColor: value } } })} />
              <ColorField label="Background" value={form.theme.light.backgroundColor} onChange={value => setForm({ ...form, theme: { ...form.theme, light: { ...form.theme.light, backgroundColor: value } } })} />
              <ColorField label="Text" value={form.theme.light.textColor} onChange={value => setForm({ ...form, theme: { ...form.theme, light: { ...form.theme.light, textColor: value } } })} />
            </div>
          </div>
          <div className="theme-palette-group">
            <span className="drawer-subsection-title">Dark palette</span>
            <div className="drawer-field-row theme-palette-row">
              <ColorField label="Primary" value={form.theme.dark.primaryColor} onChange={value => setForm({ ...form, theme: { ...form.theme, dark: { ...form.theme.dark, primaryColor: value } } })} />
              <ColorField label="Background" value={form.theme.dark.backgroundColor} onChange={value => setForm({ ...form, theme: { ...form.theme, dark: { ...form.theme.dark, backgroundColor: value } } })} />
              <ColorField label="Text" value={form.theme.dark.textColor} onChange={value => setForm({ ...form, theme: { ...form.theme, dark: { ...form.theme.dark, textColor: value } } })} />
            </div>
          </div>

          <h4 className="drawer-section-title">Default access</h4>
          <label className="drawer-checkbox"><input type="checkbox" checked={form.defaultAccess.autoGrantOnSignup} onChange={event => setForm({ ...form, defaultAccess: { ...form.defaultAccess, autoGrantOnSignup: event.target.checked } })} /><span>Grant automatically when a new organization is created</span></label>
          <label className="drawer-checkbox"><input type="checkbox" checked={form.defaultAccess.requiresApproval} onChange={event => setForm({ ...form, defaultAccess: { ...form.defaultAccess, requiresApproval: event.target.checked } })} /><span>Requires approval before access is granted</span></label>
          <label className="drawer-field"><span>Tier</span><select value={form.defaultAccess.tier} onChange={event => setForm({ ...form, defaultAccess: { ...form.defaultAccess, tier: event.target.value as 'trial' | 'free' | 'paid' } })}><option value="trial">Trial</option><option value="free">Free</option><option value="paid">Paid</option></select></label>

          <h4 className="drawer-section-title">Country restriction</h4>
          <label className="drawer-checkbox"><input type="checkbox" checked={form.countryRestriction.enabled} onChange={event => setForm({ ...form, countryRestriction: { ...form.countryRestriction, enabled: event.target.checked } })} /><span>Only available in specific countries</span></label>
          {form.countryRestriction.enabled && <label className="drawer-field"><span>Countries (ISO codes, comma-separated)</span><input value={form.countriesText} onChange={event => setForm({ ...form, countriesText: event.target.value })} placeholder="AU, NZ" /></label>}

          <h4 className="drawer-section-title">Allowed flows</h4>
          <div className="drawer-flow-checkboxes">
            {ALL_FLOWS.map(flow => <label key={flow} className="drawer-checkbox"><input type="checkbox" checked={form.allowedFlows.includes(flow)} onChange={() => toggleFlow(flow)} /><span>{flow}</span></label>)}
          </div>
        </form>
        <footer className="drawer-footer"><button type="button" onClick={closeDrawer} disabled={saving}>Cancel</button><button type="submit" form="app-form" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></footer>
      </>}
    </aside></div>}
  </section></main>;
}
