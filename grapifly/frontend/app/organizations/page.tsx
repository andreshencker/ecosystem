'use client';

import { FormEvent, useEffect, useState } from 'react';
import { GrapiflyAppShell } from '@/components/GrapiflyAppShell';
import { OrganizationProfile, OrganizationProfileTabs } from '@/components/OrganizationProfileTabs';

interface OrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  membership: { role: 'owner' | 'admin' | 'member' };
  applications: string[];
}

interface OrganizationDetails {
  organization: OrganizationProfile;
  membership: { role: 'owner' | 'admin' | 'member' };
  applications: { applicationKey: string }[];
  members: { membershipId: string; role: string; applications: { applicationKey: string; role: string }[]; user: { displayName: string; email: string; avatarUrl: string | null } | null }[];
  invitations: { invitationId: string; email: string; role: string; applicationKeys: string[]; expiresAt: string }[];
}

export default function OrganizationsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<OrganizationDetails | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [invitationLink, setInvitationLink] = useState('');
  const [message, setMessage] = useState('');

  async function loadOrganizations(preferredId?: string) {
    const response = await fetch(`${apiUrl}/organizations`, { credentials: 'include' });
    if (response.status === 401) { window.location.replace('/'); return; }
    if (!response.ok) throw new Error('Unable to load organizations');
    const data = await response.json();
    setOrganizations(data.organizations);
    const nextId = preferredId ?? selectedId ?? data.organizations[0]?.organizationId ?? null;
    setSelectedId(nextId);
    if (nextId) await loadDetails(nextId);
  }

  async function loadDetails(organizationId: string) {
    const response = await fetch(`${apiUrl}/organizations/${organizationId}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Unable to load organization');
    setDetails(await response.json());
  }

  useEffect(() => { loadOrganizations().catch(() => setMessage('Organizations could not be loaded.')); }, []);

  async function createOrganization(event: FormEvent) {
    event.preventDefault(); setMessage('');
    const response = await fetch(`${apiUrl}/organizations`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: organizationName }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message ?? 'Organization could not be created.'); return; }
    setOrganizationName('');
    await loadOrganizations(data.organizationId);
    setMessage('Organization created. You are its owner.');
  }

  async function enableRelay() {
    if (!selectedId) return;
    const response = await fetch(`${apiUrl}/organizations/${selectedId}/applications`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationKey: 'relay' }) });
    if (!response.ok) { const data = await response.json(); setMessage(data.message ?? 'Relay could not be enabled.'); return; }
    await loadOrganizations(selectedId);
    setMessage('Relay is now enabled for this organization.');
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    const applicationKeys = details?.applications.map((application) => application.applicationKey) ?? [];
    const response = await fetch(`${apiUrl}/organizations/${selectedId}/invitations`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, role: inviteRole, applicationKeys }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message ?? 'Invitation could not be created.'); return; }
    const link = `${window.location.origin}/invitations/${data.token}`;
    setInvitationLink(link); setInviteEmail('');
    await loadDetails(selectedId);
    setMessage('Invitation created. Copy the secure link and send it to the invited person.');
  }

  const canManage = details && ['owner', 'admin'].includes(details.membership.role);
  return <GrapiflyAppShell><section className="organizations-page organizations-embedded">
    <section className="organizations-shell">
      <header className="organizations-heading"><div><span className="section-kicker">Grapifly Organizations</span><h1>Your teams.<br/>One identity.</h1><p>Create several organizations, choose their apps and invite the people who work with you.</p></div>
        <form onSubmit={createOrganization}><label>New organization</label><div><input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Organization name" required/><button>Create</button></div></form>
      </header>
      {message && <div className="organization-message">{message}</div>}
      <div className="organizations-layout">
        <aside className="organization-list"><h2>Organizations</h2>{organizations.map((organization) => <button key={organization.organizationId} className={selectedId === organization.organizationId ? 'active' : ''} onClick={() => { setSelectedId(organization.organizationId); loadDetails(organization.organizationId); setInvitationLink(''); }}><span>{organization.name[0]}</span><div><strong>{organization.name}</strong><small>{organization.membership.role} · {organization.applications.length} apps</small></div></button>)}{organizations.length === 0 && <p>Create your first organization to begin.</p>}</aside>
        <section className="organization-detail">{details ? <>
          <header><div><span>{details.membership.role}</span><h2>{details.organization.name}</h2><p>{details.organization.slug}</p></div><code>{details.organization.organizationId}</code></header>
          <OrganizationProfileTabs organization={details.organization} ownerEmail={details.members.find((member) => member.role === 'owner')?.user?.email ?? 'Not assigned'} canManage={Boolean(canManage)} apiUrl={apiUrl} onSaved={(organization) => setDetails({ ...details, organization })}/>
          <div className="organization-section-title"><div><h3>Applications</h3><p>Solutions enabled for everyone in this organization.</p></div>{canManage && !details.applications.some((app) => app.applicationKey === 'relay') && <button onClick={enableRelay}>Enable Relay</button>}</div>
          <div className="organization-apps">{details.applications.map((application) => <span key={application.applicationKey}>✦ {application.applicationKey}</span>)}{details.applications.length === 0 && <p>No applications enabled yet.</p>}</div>
          <div className="organization-section-title"><div><h3>Members</h3><p>Identity and membership are managed centrally by Grapifly.</p></div></div>
          <div className="member-list">{details.members.map((member) => <article key={member.membershipId}>{member.user?.avatarUrl ? <img src={member.user.avatarUrl} alt=""/> : <span>{member.user?.displayName?.[0] ?? 'G'}</span>}<div><strong>{member.user?.displayName ?? 'Grapifly user'}</strong><small>{member.user?.email}{member.applications.length > 0 ? ` · ${member.applications.map((app) => app.applicationKey).join(', ')}` : ''}</small></div><b>{member.role}</b></article>)}</div>
          {canManage && <form className="invitation-form" onSubmit={invite}><div><h3>Invite a member</h3><p>The invitation grants membership and access to the enabled applications.</p></div><div className="invitation-fields"><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" required/><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as 'member' | 'admin')}><option value="member">Member</option><option value="admin">Administrator</option></select><button>Invite</button></div>{invitationLink && <div className="invitation-link"><input readOnly value={invitationLink}/><button type="button" onClick={() => navigator.clipboard.writeText(invitationLink)}>Copy link</button></div>}</form>}
          {details.invitations.length > 0 && <div className="pending-invitations"><h3>Pending invitations</h3>{details.invitations.map((invitation) => <p key={invitation.invitationId}><strong>{invitation.email}</strong><span>{invitation.role} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</span></p>)}</div>}
        </> : <div className="organization-empty"><h2>Select an organization</h2><p>Its applications, members and invitations will appear here.</p></div>}</section>
      </div>
    </section>
  </section></GrapiflyAppShell>;
}
