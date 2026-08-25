'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GrapiflyAppShell } from '@/components/GrapiflyAppShell';

type EntityType = 'company' | 'individual';
type Role = 'owner' | 'admin' | 'member';

interface OrgEntry {
  organizationId: string; name: string; slug: string; entityType: EntityType;
  legalName: string; tagline: string; timezone: string;
  officialEmail: string; supportEmail: string; supportPhone: string; supportPhoneCountryCode: string; supportPhoneNumber: string; supportHours: string;
  addressLine1: string; addressLine2: string; addressCity: string; addressState: string; addressPostalCode: string; addressCountry: string;
  websiteUrl: string; helpCenterUrl: string; privacyPolicyUrl: string; termsUrl: string;
  facebook: string; instagram: string; linkedin: string; x: string; youtube: string; tiktok: string; whatsapp: string; telegram: string;
  copyrightText: string; disclaimerShort: string; disclaimerLong: string; logoIconUrl: string; logoFullUrl: string;
  isPlatform: boolean; isDefault: boolean;
  membership: { role: Role };
  applications: string[];
}

type DrawerMode = 'create' | 'edit' | null;

const TEXT_FIELDS = [
  'legalName', 'tagline', 'timezone',
  'officialEmail', 'supportEmail', 'supportPhoneCountryCode', 'supportPhoneNumber', 'supportHours',
  'addressLine1', 'addressLine2', 'addressCity', 'addressState', 'addressPostalCode', 'addressCountry',
  'websiteUrl', 'helpCenterUrl', 'privacyPolicyUrl', 'termsUrl',
  'facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'whatsapp', 'telegram',
  'copyrightText', 'disclaimerShort', 'disclaimerLong', 'logoIconUrl', 'logoFullUrl',
] as const;
type TextField = typeof TEXT_FIELDS[number];

interface FormState {
  name: string; entityType: EntityType;
  fields: Record<TextField, string>;
}

function emptyTextFields(): Record<TextField, string> {
  return Object.fromEntries(TEXT_FIELDS.map(field => [field, ''])) as Record<TextField, string>;
}
function emptyForm(): FormState {
  return { name: '', entityType: 'company', fields: emptyTextFields() };
}
function formFromOrg(org: OrgEntry): FormState {
  const fields = emptyTextFields();
  for (const field of TEXT_FIELDS) fields[field] = org[field] ?? '';
  return { name: org.name, entityType: org.entityType, fields };
}

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.474 5.408 18.592 7.53M4 20l.688-3.44a2 2 0 0 1 .551-1.03l9.9-9.9a1.5 1.5 0 0 1 2.122 0l1.61 1.61a1.5 1.5 0 0 1 0 2.122l-9.9 9.9a2 2 0 0 1-1.03.55L4 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ViewIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.6" /></svg>;
}
function DeleteIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TextField({ label, field, form, setForm, disabled, placeholder }: { label: string; field: TextField; form: FormState; setForm: (f: FormState) => void; disabled: boolean; placeholder?: string }) {
  return <label className="drawer-field"><span>{label}</span><input value={form.fields[field]} disabled={disabled} onChange={event => setForm({ ...form, fields: { ...form.fields, [field]: event.target.value } })} placeholder={placeholder} /></label>;
}

export default function OrganizationsPage() {
  return <GrapiflyAppShell><OrganizationsContent /></GrapiflyAppShell>;
}

function OrganizationsContent() {
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const [orgs, setOrgs] = useState<OrgEntry[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerOrg, setDrawerOrg] = useState<OrgEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    return fetch(`${apiUrl}/organizations`, { credentials: 'include' }).then(async response => {
      if (response.status === 401) { window.location.replace('/'); return null; }
      if (!response.ok) throw new Error();
      return response.json();
    }).then(data => { if (data) { setOrgs(data.organizations); setState('ready'); } }).catch(() => setState('error'));
  }, [apiUrl]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return orgs.filter(org => {
      if (roleFilter !== 'all' && org.membership.role !== roleFilter) return false;
      if (q && !`${org.name} ${org.slug}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orgs, query, roleFilter]);

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

  const canManage = drawerOrg ? ['owner', 'admin'].includes(drawerOrg.membership.role) : true;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(''); setSaving(true);
    try {
      if (drawerMode === 'create') {
        const response = await fetch(`${apiUrl}/organizations`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, entityType: form.entityType }) });
        const created = await response.json().catch(() => null);
        if (!response.ok) throw new Error(created?.message ?? 'Could not create organization');
        const filledFields = Object.fromEntries(Object.entries(form.fields).filter(([, value]) => value.trim() !== ''));
        if (Object.keys(filledFields).length > 0) {
          const patchResponse = await fetch(`${apiUrl}/organizations/${created.organizationId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(filledFields) });
          if (!patchResponse.ok) { const body = await patchResponse.json().catch(() => null); throw new Error(body?.message ?? 'Organization was created, but its profile details could not be saved'); }
        }
      } else if (drawerMode === 'edit' && drawerOrg) {
        if (!canManage) throw new Error('You do not have permission to edit this organization');
        const response = await fetch(`${apiUrl}/organizations/${drawerOrg.organizationId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, entityType: form.entityType, ...form.fields }) });
        if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Could not update organization'); }
      }
      setDrawerMode(null); setDrawerOrg(null);
      await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not save organization'); }
    finally { setSaving(false); }
  }

  async function handleArchive(org: OrgEntry) {
    if (!window.confirm(`Archive organization "${org.name}"? Its apps and invitations will be disabled.`)) return;
    try {
      const response = await fetch(`${apiUrl}/organizations/${org.organizationId}/archive`, { method: 'POST', credentials: 'include' });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Could not archive organization'); }
      await load();
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Could not archive organization'); }
  }

  return <section className="organizations-page organizations-embedded"><section className="organizations-shell">
    <header className="organizations-heading"><div><span className="section-kicker">Grapifly Organizations</span><h1>Your identity.<br />Your profile.</h1><p>Every organization you own or belong to — team and apps now live under Teams and My apps.</p></div></header>

    {state === 'loading' && <div className="organization-empty"><p>Loading organizations…</p></div>}
    {state === 'error' && <div className="organization-empty"><p>Organizations could not be loaded.</p></div>}

    {state === 'ready' && <section className="role-panel">
      <div className="role-panel-header">
        <div><h3>Your organizations</h3><p>{orgs.length} organizations total, {filtered.length} matching current filters</p></div>
        <button type="button" className="role-add-button" onClick={openCreate}>+ New organization</button>
      </div>

      <div className="role-filters">
        <label className="role-filter-field"><span>Role</span><select value={roleFilter} onChange={event => setRoleFilter(event.target.value as any)}>
          <option value="all">All</option><option value="owner">Owner</option><option value="admin">Admin</option><option value="member">Member</option>
        </select></label>
        <label className="role-filter-field role-filter-search"><span>Search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search organization" /></label>
      </div>

      <div className="users-table-wrap"><table className="users-table app-table"><thead><tr><th>Organization</th><th>Role</th><th>Apps</th><th></th></tr></thead><tbody>
        {filtered.map(org => <tr key={org.organizationId}>
          <td><div className="app-row-identity"><span className="app-swatch" style={{ background: '#efeaff', color: '#5c47ce' }}>{org.name[0]}</span><div><strong>{org.name}</strong><small>{org.slug}{org.isPlatform ? ' · platform' : ''}{org.isDefault ? ' · default' : ''}</small></div></div></td>
          <td style={{ textTransform: 'capitalize' }}>{org.membership.role}</td>
          <td>{org.applications.length}</td>
          <td><div className="role-row-actions">
            <button type="button" title={['owner', 'admin'].includes(org.membership.role) ? 'Edit organization' : 'View organization'} aria-label={['owner', 'admin'].includes(org.membership.role) ? 'Edit organization' : 'View organization'} onClick={() => openEdit(org)}>{['owner', 'admin'].includes(org.membership.role) ? <EditIcon /> : <ViewIcon />}</button>
            {org.membership.role === 'owner' && !org.isPlatform && !org.isDefault && <button type="button" className="danger" title="Archive organization" aria-label="Archive organization" onClick={() => handleArchive(org)}><DeleteIcon /></button>}
          </div></td>
        </tr>)}
      </tbody></table>
      {filtered.length === 0 && <div className="organization-empty"><p>{orgs.length === 0 ? 'Create your first organization to begin.' : 'No organizations match your filters.'}</p></div>}
      </div>
    </section>}

    {drawerMode && <div className="drawer-overlay" onClick={closeDrawer}><aside className="drawer" onClick={event => event.stopPropagation()}>
      <header className="drawer-header"><div><h3>{drawerMode === 'create' ? 'Create organization' : canManage ? `Edit ${drawerOrg?.name}` : drawerOrg?.name}</h3><p>{drawerMode === 'create' ? 'You become its owner.' : canManage ? `ID: ${drawerOrg?.organizationId}` : `You are a ${drawerOrg?.membership.role} — view only.`}</p></div><button type="button" className="drawer-close" onClick={closeDrawer}>×</button></header>
      <form className="drawer-body" onSubmit={handleSubmit} id="org-form">
        {formError && <div className="drawer-error">{formError}</div>}

        <h4 className="drawer-section-title">General</h4>
        <label className="drawer-field"><span>Name</span><input value={form.name} disabled={!canManage} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Organization name" required /></label>
        <label className="drawer-field"><span>Type</span><select value={form.entityType} disabled={!canManage} onChange={event => setForm({ ...form, entityType: event.target.value as EntityType })}><option value="company">Company</option><option value="individual">Individual</option></select></label>

        <>
          <TextField label="Legal name" field="legalName" form={form} setForm={setForm} disabled={!canManage} />
          <TextField label="Tagline" field="tagline" form={form} setForm={setForm} disabled={!canManage} />
          <TextField label="Timezone" field="timezone" form={form} setForm={setForm} disabled={!canManage} />

          <h4 className="drawer-section-title">Contact</h4>
          <TextField label="Official email" field="officialEmail" form={form} setForm={setForm} disabled={!canManage} />
          <TextField label="Support email" field="supportEmail" form={form} setForm={setForm} disabled={!canManage} />
          <div className="drawer-field-row">
            <TextField label="Support phone country code" field="supportPhoneCountryCode" form={form} setForm={setForm} disabled={!canManage} placeholder="+61" />
            <TextField label="Support phone number" field="supportPhoneNumber" form={form} setForm={setForm} disabled={!canManage} />
          </div>
          <TextField label="Support hours" field="supportHours" form={form} setForm={setForm} disabled={!canManage} />

          <h4 className="drawer-section-title">Address</h4>
          <TextField label="Address line 1" field="addressLine1" form={form} setForm={setForm} disabled={!canManage} />
          <TextField label="Address line 2" field="addressLine2" form={form} setForm={setForm} disabled={!canManage} />
          <div className="drawer-field-row">
            <TextField label="City" field="addressCity" form={form} setForm={setForm} disabled={!canManage} />
            <TextField label="State" field="addressState" form={form} setForm={setForm} disabled={!canManage} />
          </div>
          <div className="drawer-field-row">
            <TextField label="Postal code" field="addressPostalCode" form={form} setForm={setForm} disabled={!canManage} />
            <TextField label="Country" field="addressCountry" form={form} setForm={setForm} disabled={!canManage} />
          </div>

          <h4 className="drawer-section-title">Digital</h4>
          <TextField label="Website" field="websiteUrl" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
          <TextField label="Help center" field="helpCenterUrl" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
          <TextField label="Privacy policy" field="privacyPolicyUrl" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
          <TextField label="Terms" field="termsUrl" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />

          <h4 className="drawer-section-title">Social</h4>
          <div className="drawer-field-row">
            <TextField label="Facebook" field="facebook" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
            <TextField label="Instagram" field="instagram" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
          </div>
          <div className="drawer-field-row">
            <TextField label="LinkedIn" field="linkedin" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
            <TextField label="X" field="x" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
          </div>
          <div className="drawer-field-row">
            <TextField label="YouTube" field="youtube" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
            <TextField label="TikTok" field="tiktok" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
          </div>
          <div className="drawer-field-row">
            <TextField label="WhatsApp" field="whatsapp" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
            <TextField label="Telegram" field="telegram" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
          </div>

          <h4 className="drawer-section-title">Legal</h4>
          <TextField label="Copyright text" field="copyrightText" form={form} setForm={setForm} disabled={!canManage} />
          <TextField label="Disclaimer (short)" field="disclaimerShort" form={form} setForm={setForm} disabled={!canManage} />
          <TextField label="Disclaimer (long)" field="disclaimerLong" form={form} setForm={setForm} disabled={!canManage} />

          <h4 className="drawer-section-title">Brand</h4>
          <TextField label="Icon logo URL" field="logoIconUrl" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
          <TextField label="Full logo URL" field="logoFullUrl" form={form} setForm={setForm} disabled={!canManage} placeholder="https://" />
        </>
      </form>
      <footer className="drawer-footer"><button type="button" onClick={closeDrawer} disabled={saving}>{canManage ? 'Cancel' : 'Close'}</button>{canManage && <button type="submit" form="org-form" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>}</footer>
    </aside></div>}
  </section></section>;
}
