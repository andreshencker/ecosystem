'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GrapiflyAppShell, useGrapiflyShell } from '@/components/GrapiflyAppShell';

type Role = 'owner' | 'admin' | 'member';
type RowStatus = 'active' | 'pending' | 'expired';

interface Member {
  membershipId: string;
  role: Role;
  applications: { applicationKey: string; role: string }[];
  user: { displayName: string; email: string; avatarUrl: string | null } | null;
}
interface Invitation {
  invitationId: string;
  email: string;
  role: string;
  applicationKeys: string[];
  expiresAt: string;
  status: 'pending' | 'expired';
}
interface Details {
  membership: { role: Role };
  applications: { applicationKey: string }[];
  members: Member[];
  invitations: Invitation[];
}

interface TeamRow {
  id: string;
  kind: 'member' | 'invitation';
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: RowStatus;
  invitation?: Invitation;
}

type DrawerMode = 'invite' | 'link' | null;

function RegenerateIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12a8 8 0 0 1 13.66-5.66L20 8.5M20 12a8 8 0 0 1-13.66 5.66L4 15.5M20 4v4.5h-4.5M4 20v-4.5h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function CancelIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

export default function TeamsPage() {
  return <GrapiflyAppShell><TeamsContent /></GrapiflyAppShell>;
}

function TeamsContent() {
  const { selectedOrganization } = useGrapiflyShell();
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const [details, setDetails] = useState<Details | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RowStatus>('all');

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [invitationLink, setInvitationLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [rowActionId, setRowActionId] = useState<string | null>(null);

  const load = useCallback((organizationId: string) => {
    setState('loading');
    return fetch(`${apiUrl}/organizations/${organizationId}`, { credentials: 'include' })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { setDetails(data); setState('ready'); })
      .catch(() => setState('error'));
  }, [apiUrl]);

  useEffect(() => {
    if (selectedOrganization) load(selectedOrganization.organizationId);
  }, [selectedOrganization, load]);

  const canManage = Boolean(details && ['owner', 'admin'].includes(details.membership.role));

  const rows: TeamRow[] = useMemo(() => {
    if (!details) return [];
    const memberRows: TeamRow[] = details.members.map(member => ({
      id: member.membershipId, kind: 'member', status: 'active',
      displayName: member.user?.displayName ?? 'Grapifly user', email: member.user?.email ?? '',
      avatarUrl: member.user?.avatarUrl ?? null, role: member.role,
    }));
    const invitationRows: TeamRow[] = details.invitations.map(invitation => ({
      id: invitation.invitationId, kind: 'invitation', status: invitation.status,
      displayName: invitation.email, email: invitation.email, avatarUrl: null, role: invitation.role, invitation,
    }));
    return [...memberRows, ...invitationRows];
  }, [details]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rows.filter(row => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (q && !`${row.displayName} ${row.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, statusFilter]);

  function openInvite() {
    setDrawerMode('invite'); setInviteEmail(''); setInviteRole('member'); setFormError(''); setInvitationLink('');
  }
  function closeDrawer() {
    if (saving) return;
    setDrawerMode(null); setFormError(''); setInvitationLink('');
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedOrganization) return;
    setFormError(''); setSaving(true);
    try {
      const applicationKeys = details?.applications.map(app => app.applicationKey) ?? [];
      const response = await fetch(`${apiUrl}/organizations/${selectedOrganization.organizationId}/invitations`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, applicationKeys }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? 'Invitation could not be created');
      setInvitationLink(`${window.location.origin}/invitations/${data.token}`);
      setDrawerMode('link');
      await load(selectedOrganization.organizationId);
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Invitation could not be created'); }
    finally { setSaving(false); }
  }

  async function handleRegenerate(invitation: Invitation) {
    if (!selectedOrganization) return;
    setRowActionId(invitation.invitationId);
    try {
      const response = await fetch(`${apiUrl}/organizations/${selectedOrganization.organizationId}/invitations/${invitation.invitationId}/regenerate`, { method: 'POST', credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? 'Invitation link could not be regenerated');
      setInvitationLink(`${window.location.origin}/invitations/${data.token}`);
      setDrawerMode('link');
      await load(selectedOrganization.organizationId);
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Invitation link could not be regenerated'); }
    finally { setRowActionId(null); }
  }

  async function handleCancel(invitation: Invitation) {
    if (!selectedOrganization || !window.confirm(`Cancel the invitation for ${invitation.email}?`)) return;
    setRowActionId(invitation.invitationId);
    try {
      const response = await fetch(`${apiUrl}/organizations/${selectedOrganization.organizationId}/invitations/${invitation.invitationId}/cancel`, { method: 'POST', credentials: 'include' });
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.message ?? 'Invitation could not be cancelled'); }
      await load(selectedOrganization.organizationId);
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Invitation could not be cancelled'); }
    finally { setRowActionId(null); }
  }

  return <section className="organizations-page organizations-embedded"><section className="organizations-shell">
    <header className="organizations-heading"><div><span className="section-kicker">Grapifly Teams</span><h1>Your people.<br />One membership.</h1><p>Members and invitations for {selectedOrganization?.name ?? 'your organization'} — identity is managed centrally by Grapifly.</p></div></header>

    {!selectedOrganization && <div className="organization-empty"><p>Create or select an organization to manage its team.</p></div>}
    {selectedOrganization && state === 'loading' && <div className="organization-empty"><p>Loading team…</p></div>}
    {selectedOrganization && state === 'error' && <div className="organization-empty"><p>The team could not be loaded.</p></div>}

    {selectedOrganization && state === 'ready' && details && <section className="role-panel">
      <div className="role-panel-header">
        <div><h3>Team</h3><p>{rows.length} people total, {filtered.length} matching current filters</p></div>
        {canManage && <button type="button" className="role-add-button" onClick={openInvite}>+ Invite member</button>}
      </div>

      <div className="role-filters">
        <label className="role-filter-field"><span>Status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as any)}>
          <option value="all">All</option><option value="active">Active</option><option value="pending">Pending</option><option value="expired">Expired</option>
        </select></label>
        <label className="role-filter-field role-filter-search"><span>Search</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or email" /></label>
      </div>

      <div className="users-table-wrap"><table className="users-table app-table"><thead><tr><th>Person</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
        {filtered.map(row => <tr key={row.id}>
          <td><div className="app-row-identity">{row.avatarUrl ? <img src={row.avatarUrl} alt="" className="app-swatch" /> : <span className="app-swatch" style={{ background: '#efeaff', color: '#5c47ce' }}>{row.displayName[0]?.toUpperCase()}</span>}<div><strong>{row.displayName}</strong><small>{row.email}</small></div></div></td>
          <td style={{ textTransform: 'capitalize' }}>{row.role}</td>
          <td><span className={`status-badge ${row.status === 'active' ? 'active' : row.status === 'pending' ? '' : 'inactive'}`}>{row.status}</span></td>
          <td>{row.kind === 'invitation' && canManage && <div className="role-row-actions">
            <button type="button" title="Send new link" aria-label="Send new link" disabled={rowActionId === row.invitation!.invitationId} onClick={() => handleRegenerate(row.invitation!)}><RegenerateIcon /></button>
            {row.status === 'pending' && <button type="button" className="danger" title="Cancel invitation" aria-label="Cancel invitation" disabled={rowActionId === row.invitation!.invitationId} onClick={() => handleCancel(row.invitation!)}><CancelIcon /></button>}
          </div>}</td>
        </tr>)}
      </tbody></table>
      {filtered.length === 0 && <div className="organization-empty"><p>{rows.length === 0 ? 'No members yet.' : 'No one matches your filters.'}</p></div>}
      </div>
    </section>}

    {drawerMode && <div className="drawer-overlay" onClick={closeDrawer}><aside className="drawer" onClick={event => event.stopPropagation()}>
      {drawerMode === 'link' ? <>
        <header className="drawer-header"><div><h3>Invitation link ready</h3><p>Send this link to the invited person.</p></div><button type="button" className="drawer-close" onClick={closeDrawer}>×</button></header>
        <div className="drawer-body">
          <div className="drawer-field"><span>Invitation link</span><code className="app-secret-value">{invitationLink}</code></div>
          <p className="app-secret-hint">Anyone with this link can accept the invitation and join {selectedOrganization?.name}. Sending a new link (regenerate) invalidates this one.</p>
        </div>
        <footer className="drawer-footer"><button type="button" onClick={() => navigator.clipboard.writeText(invitationLink)}>Copy link</button><button type="button" onClick={closeDrawer}>Done</button></footer>
      </> : <>
        <header className="drawer-header"><div><h3>Invite a member</h3><p>Grants membership and access to the enabled applications.</p></div><button type="button" className="drawer-close" onClick={closeDrawer}>×</button></header>
        <form className="drawer-body" onSubmit={handleInvite} id="invite-form">
          {formError && <div className="drawer-error">{formError}</div>}
          <label className="drawer-field"><span>Email</span><input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="name@company.com" required /></label>
          <label className="drawer-field"><span>Role</span><select value={inviteRole} onChange={event => setInviteRole(event.target.value as 'member' | 'admin')}><option value="member">Member</option><option value="admin">Administrator</option></select></label>
        </form>
        <footer className="drawer-footer"><button type="button" onClick={closeDrawer} disabled={saving}>Cancel</button><button type="submit" form="invite-form" disabled={saving}>{saving ? 'Inviting…' : 'Invite'}</button></footer>
      </>}
    </aside></div>}
  </section></section>;
}
