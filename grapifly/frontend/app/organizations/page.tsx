'use client';

import { useCallback, useEffect, useState } from 'react';
import { GrapiflyAppShell, useGrapiflyShell } from '@/components/GrapiflyAppShell';
import { OrganizationProfileTabs, type OrganizationProfile } from '@/components/OrganizationProfileTabs';

const EMPTY_PROFILE: Omit<OrganizationProfile, 'organizationId' | 'name' | 'slug' | 'status' | 'isPlatform'> = {
  entityType: 'company',
  legalName: '', tagline: '', timezone: 'Australia/Sydney',
  officialEmail: '', supportEmail: '', supportPhoneCountryCode: '', supportPhoneNumber: '', supportHours: '',
  addressLine1: '', addressLine2: '', addressCity: '', addressState: '', addressPostalCode: '', addressCountry: '',
  websiteUrl: '', apiBaseUrl: '', helpCenterUrl: '', privacyPolicyUrl: '', termsUrl: '', unsubscribeUrl: '',
  facebook: '', instagram: '', linkedin: '', x: '', youtube: '', tiktok: '', whatsapp: '', telegram: '',
  copyrightText: '', disclaimerShort: '', disclaimerLong: '', logoIconUrl: '', logoFullUrl: '',
  bankAccountHolder: '', bankName: '', bankAccountNumber: '', bankSwiftBic: '', bankCountry: '',
  usdtWalletAddress: '', usdtNetwork: '',
};

function normalizeProfile(raw: Record<string, unknown>): OrganizationProfile {
  const merged = { ...EMPTY_PROFILE, ...raw } as Record<string, unknown>;
  const out = {} as OrganizationProfile;
  for (const key of Object.keys(EMPTY_PROFILE) as (keyof typeof EMPTY_PROFILE)[]) {
    (out[key] as unknown) = merged[key] ?? EMPTY_PROFILE[key];
  }
  out.organizationId = String(raw.organizationId ?? '');
  out.name = String(raw.name ?? '');
  out.slug = String(raw.slug ?? '');
  out.status = (raw.status as OrganizationProfile['status']) ?? 'active';
  out.isPlatform = Boolean(raw.isPlatform);
  out.createdAt = raw.createdAt as string | undefined;
  out.updatedAt = raw.updatedAt as string | undefined;
  return out;
}

export default function OrganizationsPage() {
  return <GrapiflyAppShell><OrganizationProfilePage /></GrapiflyAppShell>;
}

function OrganizationProfilePage() {
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  const { selectedOrganization } = useGrapiflyShell();
  const organizationId = selectedOrganization?.organizationId ?? '';

  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const load = useCallback(() => {
    if (!organizationId) { setProfile(null); setState('idle'); return; }
    setState('loading');
    fetch(`${apiUrl}/organizations/${organizationId}`, { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) { window.location.replace('/'); return null; }
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (!data) return;
        setProfile(normalizeProfile(data.organization ?? data));
        setRole(data.membership?.role ?? selectedOrganization?.membership.role ?? 'member');
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [apiUrl, organizationId, selectedOrganization?.membership.role]);

  useEffect(() => { load(); }, [load]);

  const canManage = ['owner', 'admin'].includes(role);

  return <section className="organizations-page organizations-embedded"><section className="organizations-shell">
    <header className="organizations-heading">
      <div>
        <span className="section-kicker">Grapifly</span>
        <h1>My organization</h1>
        <p>
          {selectedOrganization
            ? <>Profile for <strong>{selectedOrganization.name}</strong> — switch organization from the sidebar. You are {canManage ? `an ${role}` : `a ${role} (view only)`}.</>
            : 'Select or create an organization from the sidebar to manage its profile.'}
        </p>
      </div>
    </header>

    {state === 'loading' && <div className="organization-empty"><p>Loading organization…</p></div>}
    {state === 'error' && <div className="organization-empty"><p>This organization could not be loaded.</p></div>}
    {state === 'idle' && !organizationId && <div className="organization-empty"><p>No organization selected. Use the sidebar to create one.</p></div>}

    {state === 'ready' && profile && (
      <OrganizationProfileTabs
        key={profile.organizationId}
        organization={profile}
        canManage={canManage}
        apiUrl={apiUrl}
        onSaved={(updated) => setProfile((current) => (current ? { ...current, ...updated } : updated))}
      />
    )}
  </section></section>;
}
