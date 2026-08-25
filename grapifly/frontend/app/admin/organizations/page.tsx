'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/AdminSidebar';

type EntityType = 'company' | 'individual';
type Status = 'active' | 'suspended' | 'archived';

interface OrgEntry {
  organizationId: string; name: string; slug: string; createdBy: string; entityType: EntityType;
  legalName: string; tagline: string; timezone: string;
  officialEmail: string; supportEmail: string; supportPhone: string; supportPhoneCountryCode: string; supportPhoneNumber: string; supportHours: string;
  addressLine1: string; addressLine2: string; addressCity: string; addressState: string; addressPostalCode: string; addressCountry: string;
  websiteUrl: string; apiBaseUrl: string; helpCenterUrl: string; privacyPolicyUrl: string; termsUrl: string; unsubscribeUrl: string;
  facebook: string; instagram: string; linkedin: string; x: string; youtube: string; tiktok: string; whatsapp: string; telegram: string;
  copyrightText: string; disclaimerShort: string; disclaimerLong: string; logoIconUrl: string; logoFullUrl: string;
  isPlatform: boolean; isDefault: boolean; status: Status;
}

type DrawerMode = 'create' | 'edit' | null;

const TEXT_FIELDS = [
  'legalName', 'tagline', 'timezone',
  'officialEmail', 'supportEmail', 'supportPhoneCountryCode', 'supportPhoneNumber', 'supportHours',
  'addressLine1', 'addressLine2', 'addressCity', 'addressState', 'addressPostalCode', 'addressCountry',
  'websiteUrl', 'apiBaseUrl', 'helpCenterUrl', 'privacyPolicyUrl', 'termsUrl', 'unsubscribeUrl',
  'facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'whatsapp', 'telegram',
  'copyrightText', 'disclaimerShort', 'disclaimerLong', 'logoIconUrl', 'logoFullUrl',
] as const;
type TextField = typeof TEXT_FIELDS[number];

interface FormState {
  name: string; entityType: EntityType; status: Status; ownerEmail: string;
  fields: Record<TextField, string>;
}

function emptyTextFields(): Record<TextField, string> {
  return Object.fromEntries(TEXT_FIELDS.map(field => [field, ''])) as Record<TextField, string>;
}
function emptyForm(): FormState {
  return { name: '', entityType: 'company', status: 'active', ownerEmail: '', fields: emptyTextFields() };
}
function formFromOrg(org: OrgEntry): FormState {
  const fields = emptyTextFields();
  for (const field of TEXT_FIELDS) fields[field] = org[field] ?? '';
  return { name: org.name, entityType: org.entityType, status: org.status, ownerEmail: '', fields };
}

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.474 5.408 18.592 7.53M4 20l.688-3.44a2 2 0 0 1 .551-1.03l9.9-9.9a1.5 1.5 0 0 1 2.122 0l1.61 1.61a1.5 1.5 0 0 1 0 2.122l-9.9 9.9a2 2 0 0 1-1.03.55L4 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function DeleteIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TextField({ label, field, form, setForm, placeholder }: { label: string; field: TextField; form: FormState; setForm: (f: FormState) => void; placeholder?: string }) {
  return <label className="drawer-field"><span>{label}</span><input value={form.fields[field]} onChange={event => setForm({ ...form, fields: { ...form.fields, [field]: event.target.value } })} placeholder={placeholder} /></label>;
}

export default function OrganizationsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const [orgs, setOrgs] = useState<OrgEntry[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | EntityType>('all');

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerOrg, setDrawerOrg] = useState<OrgEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    return fetch(`${apiUrl}/admin/organizations`, { credentials: 'include' }).then(async response => {
      if (response.status === 401) { window.location.replace('/'); return null; }
      if (response.status === 403) { setState('forbidden'); return null; }
      if (!response.ok) throw new Error();
      return response.json();
    }).then(data => { if (data) { setOrgs(data.organizations); setState('ready'); } }).catch(() => setState('error'));
  }, [apiUrl]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return orgs.filter(org => {
      if (statusFilter !== 'all' && org.status !== statusFilter) return false;
      if (typeFilter !== 'all' && org.entityType !== typeFilter) return false;
      if (q && !`${org.name} ${org.slug} ${org.organizationId}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orgs, query, statusFilter, typeFilter]);

  function openCreate() {
    setDrawerMode('create'); setDrawerOrg(null); setForm(emptyForm()); setFormError('');
  }
  function openEdit(org: OrgEntry) {
    setDrawerMode('edit'); setDrawerOrg(org); setForm(formFromOrg(org)); setFormError('');
  }
  function closeDrawer() {
    if (saving) return;
    setDrawerMode(null); setDrawerOrg(null); setFormError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(''); setSaving(true);
    try {
      if (drawerMode === 'create') {
        const response = await fetch(`${apiUrl}/admin/organizations`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, entityType: form.entityType, ownerEmail: form.ownerEmail }) });
        if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Could not create organization'); }
      } else if (drawerMode === 'edit' && drawerOrg) {
        const response = await fetch(`${apiUrl}/admin/organizations/${drawerOrg.organizationId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, entityType: form.entityType, status: form.status, ...form.fields }) });
        if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Could not update organization'); }
      }
      setDrawerMode(null); setDrawerOrg(null);
      await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not save organization'); }
    finally { setSaving(false); }
  }

  async function handleArchive(org: OrgEntry) {
    if (!window.confirm(`Archive organization "${org.name}"? Its apps and invitations will be suspended.`)) return;
    try {
      const response = await fetch(`${apiUrl}/admin/organizations/${org.organizationId}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Could not archive organization'); }
      await load();
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Could not archive organization'); }
  }

  return <main className="employee-page"><AdminSidebar active="organizations" /><section className="employee-content">
    <header className="employee-topbar"><div><span className="section-kicker">Grapifly Administration</span><h1>Organizations</h1></div><div className="admin-pill"><span>G</span><div><strong>Super Admin</strong><small>grapiflydeveloper@gmail.com</small></div></div></header>
    <section className="catalogue-hero"><span>ECOSYSTEM ORGANIZATIONS</span><h2>Every organization.<br />One directory.</h2><p>Every organization registered in the ecosystem — profile, contact, address, brand and legal details, all managed from here.</p></section>

    {state === 'loading' && <div className="employee-message">Loading organizations…</div>}
    {state === 'forbidden' && <div className="employee-message"><strong>Administration access required.</strong></div>}
    {state === 'error' && <div className="employee-message">Organizations could not be loaded.</div>}

    {state === 'ready' && <section className="role-panel">
      <div className="role-panel-header">
        <div><h3>Registered organizations</h3><p>{orgs.length} organizations total, {filtered.length} matching current filters</p></div>
        <button type="button" className="role-add-button" onClick={openCreate}>+ New organization</button>
      </div>

      <div className="role-filters">
        <label className="role-filter-field"><span>Status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as any)}>
          <option value="all">All</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="archived">Archived</option>
        </select></label>
        <label className="role-filter-field"><span>Type</span><select value={typeFilter} onChange={event => setTypeFilter(event.target.value as any)}>
          <option value="all">All</option><option value="company">Company</option><option value="individual">Individual</option>
        </select></label>
        <label className="role-filter-field role-filter-search"><span>Search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search organization" /></label>
      </div>

      <div className="users-table-wrap"><table className="users-table app-table"><thead><tr><th>Organization</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>
        {filtered.map(org => <tr key={org.organizationId}>
          <td><div className="app-row-identity"><span className="app-swatch" style={{ background: '#efeaff', color: '#5c47ce' }}>{org.name[0]}</span><div><strong>{org.name}</strong><small>{org.slug}{org.isPlatform ? ' · platform' : ''}{org.isDefault ? ' · default' : ''}</small></div></div></td>
          <td style={{ textTransform: 'capitalize' }}>{org.entityType}</td>
          <td><span className={`status-badge ${org.status === 'active' ? 'active' : 'inactive'}`}>{org.status}</span></td>
          <td><div className="role-row-actions"><button type="button" title="Edit organization" aria-label="Edit organization" onClick={() => openEdit(org)}><EditIcon /></button>{!org.isPlatform && !org.isDefault && org.status !== 'archived' && <button type="button" className="danger" title="Archive organization" aria-label="Archive organization" onClick={() => handleArchive(org)}><DeleteIcon /></button>}</div></td>
        </tr>)}
      </tbody></table>
      {filtered.length === 0 && <div className="employee-message">{orgs.length === 0 ? 'No organizations registered yet.' : 'No organizations match your filters.'}</div>}
      </div>
    </section>}

    {drawerMode && <div className="drawer-overlay" onClick={closeDrawer}><aside className="drawer" onClick={event => event.stopPropagation()}>
      <header className="drawer-header"><div><h3>{drawerMode === 'create' ? 'Register organization' : `Edit ${drawerOrg?.name}`}</h3><p>{drawerMode === 'create' ? 'Creates the organization and assigns its owner.' : `ID: ${drawerOrg?.organizationId}`}</p></div><button type="button" className="drawer-close" onClick={closeDrawer}>×</button></header>
      <form className="drawer-body" onSubmit={handleSubmit} id="org-form">
        {formError && <div className="drawer-error">{formError}</div>}

        <h4 className="drawer-section-title">General</h4>
        <label className="drawer-field"><span>Name</span><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Organization name" required /></label>
        <div className="drawer-field-row">
          <label className="drawer-field"><span>Type</span><select value={form.entityType} onChange={event => setForm({ ...form, entityType: event.target.value as EntityType })}><option value="company">Company</option><option value="individual">Individual</option></select></label>
          {drawerMode === 'edit' && <label className="drawer-field"><span>Status</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as Status })} disabled={drawerOrg?.isPlatform}><option value="active">Active</option><option value="suspended">Suspended</option><option value="archived">Archived</option></select></label>}
        </div>
        {drawerMode === 'create' && <label className="drawer-field"><span>Owner email</span><input type="email" value={form.ownerEmail} onChange={event => setForm({ ...form, ownerEmail: event.target.value })} placeholder="owner@example.com" required /></label>}

        {drawerMode === 'edit' && <>
          <TextField label="Legal name" field="legalName" form={form} setForm={setForm} />
          <TextField label="Tagline" field="tagline" form={form} setForm={setForm} />
          <TextField label="Timezone" field="timezone" form={form} setForm={setForm} />

          <h4 className="drawer-section-title">Contact</h4>
          <TextField label="Official email" field="officialEmail" form={form} setForm={setForm} />
          <TextField label="Support email" field="supportEmail" form={form} setForm={setForm} />
          <div className="drawer-field-row">
            <TextField label="Support phone country code" field="supportPhoneCountryCode" form={form} setForm={setForm} placeholder="+61" />
            <TextField label="Support phone number" field="supportPhoneNumber" form={form} setForm={setForm} />
          </div>
          <TextField label="Support hours" field="supportHours" form={form} setForm={setForm} />

          <h4 className="drawer-section-title">Address</h4>
          <TextField label="Address line 1" field="addressLine1" form={form} setForm={setForm} />
          <TextField label="Address line 2" field="addressLine2" form={form} setForm={setForm} />
          <div className="drawer-field-row">
            <TextField label="City" field="addressCity" form={form} setForm={setForm} />
            <TextField label="State" field="addressState" form={form} setForm={setForm} />
          </div>
          <div className="drawer-field-row">
            <TextField label="Postal code" field="addressPostalCode" form={form} setForm={setForm} />
            <TextField label="Country" field="addressCountry" form={form} setForm={setForm} />
          </div>

          <h4 className="drawer-section-title">Digital</h4>
          <TextField label="Website" field="websiteUrl" form={form} setForm={setForm} placeholder="https://" />
          <TextField label="API base URL" field="apiBaseUrl" form={form} setForm={setForm} placeholder="https://" />
          <TextField label="Help center" field="helpCenterUrl" form={form} setForm={setForm} placeholder="https://" />
          <TextField label="Privacy policy" field="privacyPolicyUrl" form={form} setForm={setForm} placeholder="https://" />
          <TextField label="Terms" field="termsUrl" form={form} setForm={setForm} placeholder="https://" />
          <TextField label="Unsubscribe URL" field="unsubscribeUrl" form={form} setForm={setForm} placeholder="https://" />

          <h4 className="drawer-section-title">Social</h4>
          <div className="drawer-field-row">
            <TextField label="Facebook" field="facebook" form={form} setForm={setForm} placeholder="https://" />
            <TextField label="Instagram" field="instagram" form={form} setForm={setForm} placeholder="https://" />
          </div>
          <div className="drawer-field-row">
            <TextField label="LinkedIn" field="linkedin" form={form} setForm={setForm} placeholder="https://" />
            <TextField label="X" field="x" form={form} setForm={setForm} placeholder="https://" />
          </div>
          <div className="drawer-field-row">
            <TextField label="YouTube" field="youtube" form={form} setForm={setForm} placeholder="https://" />
            <TextField label="TikTok" field="tiktok" form={form} setForm={setForm} placeholder="https://" />
          </div>
          <div className="drawer-field-row">
            <TextField label="WhatsApp" field="whatsapp" form={form} setForm={setForm} placeholder="https://" />
            <TextField label="Telegram" field="telegram" form={form} setForm={setForm} placeholder="https://" />
          </div>

          <h4 className="drawer-section-title">Legal</h4>
          <TextField label="Copyright text" field="copyrightText" form={form} setForm={setForm} />
          <TextField label="Disclaimer (short)" field="disclaimerShort" form={form} setForm={setForm} />
          <TextField label="Disclaimer (long)" field="disclaimerLong" form={form} setForm={setForm} />

          <h4 className="drawer-section-title">Brand</h4>
          <TextField label="Icon logo URL" field="logoIconUrl" form={form} setForm={setForm} placeholder="https://" />
          <TextField label="Full logo URL" field="logoFullUrl" form={form} setForm={setForm} placeholder="https://" />
        </>}
      </form>
      <footer className="drawer-footer"><button type="button" onClick={closeDrawer} disabled={saving}>Cancel</button><button type="submit" form="org-form" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></footer>
    </aside></div>}
  </section></main>;
}
