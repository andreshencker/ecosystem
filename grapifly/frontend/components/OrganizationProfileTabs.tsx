'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

export interface OrganizationProfile {
  organizationId: string; name: string; slug: string; status: 'active' | 'suspended'; isPlatform: boolean;
  legalName: string; tagline: string; timezone: string; officialEmail: string; supportEmail: string; supportPhone: string; supportHours: string;
  addressLine1: string; addressLine2: string; addressCity: string; addressState: string; addressPostalCode: string; addressCountry: string;
  websiteUrl: string; helpCenterUrl: string; privacyPolicyUrl: string; termsUrl: string;
  facebook: string; instagram: string; linkedin: string; x: string; youtube: string; tiktok: string; whatsapp: string; telegram: string;
  copyrightText: string; disclaimerShort: string; disclaimerLong: string; logoIconUrl: string; logoFullUrl: string;
  createdAt?: string; updatedAt?: string;
}

type TabKey = 'general' | 'contact' | 'address' | 'digital' | 'legal' | 'brand' | 'platform';
const TAB_FIELDS: Record<Exclude<TabKey, 'platform'>, (keyof OrganizationProfile)[]> = {
  general: ['name', 'legalName', 'tagline', 'timezone'],
  contact: ['officialEmail', 'supportEmail', 'supportPhone', 'supportHours'],
  address: ['addressLine1', 'addressLine2', 'addressCity', 'addressState', 'addressPostalCode', 'addressCountry'],
  digital: ['websiteUrl', 'helpCenterUrl', 'privacyPolicyUrl', 'termsUrl', 'linkedin', 'instagram', 'facebook', 'x', 'youtube', 'tiktok', 'whatsapp', 'telegram'],
  legal: ['copyrightText', 'disclaimerShort', 'disclaimerLong'],
  brand: ['logoIconUrl', 'logoFullUrl'],
};

const TIMEZONES = ['UTC', 'Australia/Sydney', 'Australia/Melbourne', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Madrid', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo'];

export function OrganizationProfileTabs({ organization, ownerEmail, canManage, apiUrl, onSaved }: { organization: OrganizationProfile; ownerEmail: string; canManage: boolean; apiUrl: string; onSaved: (organization: OrganizationProfile) => void }) {
  const tabs = useMemo(() => ([
    ['general', 'General'], ['contact', 'Contact'], ['address', 'Address'], ['digital', 'Digital presence'], ['legal', 'Legal'], ['brand', 'Brand'],
    ...(organization.isPlatform ? [['platform', 'Platform']] : []),
  ] as [TabKey, string][]), [organization.isPlatform]);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [form, setForm] = useState<OrganizationProfile>(organization);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  useEffect(() => { setForm(organization); setActiveTab('general'); setState('idle'); setError(''); }, [organization.organizationId]);

  function field(name: keyof OrganizationProfile, label: string, options: { type?: string; placeholder?: string; textarea?: boolean; required?: boolean } = {}) {
    const value = String(form[name] ?? '');
    return <label className="profile-field"><span>{label}{options.required && <b> *</b>}</span>{options.textarea
      ? <textarea value={value} disabled={!canManage} placeholder={options.placeholder} onChange={(event) => { setForm({ ...form, [name]: event.target.value }); setState('idle'); }}/>
      : <input type={options.type ?? 'text'} value={value} disabled={!canManage} required={options.required} placeholder={options.placeholder} onChange={(event) => { setForm({ ...form, [name]: event.target.value }); setState('idle'); }}/>}</label>;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canManage || activeTab === 'platform') return;
    setState('saving'); setError('');
    const payload = Object.fromEntries(TAB_FIELDS[activeTab].map((key) => [key, form[key] ?? '']));
    const response = await fetch(`${apiUrl}/organizations/${organization.organizationId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) { setState('error'); setError(data.message ?? 'Changes could not be saved.'); return; }
    setForm(data); onSaved(data); setState('saved');
  }

  return <section className="organization-profile-card">
    <nav className="profile-tabs" aria-label="Organization profile sections">{tabs.map(([key, label]) => <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => { setActiveTab(key); setState('idle'); setError(''); }}>{label}</button>)}</nav>
    <form onSubmit={save}>
      {activeTab === 'general' && <div className="profile-fields two-columns">{field('name', 'Organization name', { required: true })}{field('legalName', 'Legal name')}{field('tagline', 'Tagline')}<label className="profile-field"><span>Timezone *</span><select disabled={!canManage} value={form.timezone || 'Australia/Sydney'} onChange={(event) => setForm({ ...form, timezone: event.target.value })}>{TIMEZONES.map((timezone) => <option key={timezone}>{timezone}</option>)}</select></label><label className="profile-field"><span>Organization key</span><input value={form.slug} readOnly/></label><label className="profile-field"><span>Status</span><input value={form.status} readOnly/></label></div>}
      {activeTab === 'contact' && <div className="profile-fields two-columns">{field('officialEmail', 'Official email', { type: 'email' })}{field('supportEmail', 'Support email', { type: 'email' })}{field('supportPhone', 'Support phone')}{field('supportHours', 'Support hours', { placeholder: 'Monday–Friday, 9:00–17:00' })}</div>}
      {activeTab === 'address' && <div className="profile-fields two-columns">{field('addressLine1', 'Address line 1')}{field('addressLine2', 'Address line 2')}{field('addressCity', 'City')}{field('addressState', 'State / Province')}{field('addressPostalCode', 'Postal code')}{field('addressCountry', 'Country')}</div>}
      {activeTab === 'digital' && <div className="profile-fields two-columns">{field('websiteUrl', 'Website', { type: 'url' })}{field('helpCenterUrl', 'Help center', { type: 'url' })}{field('privacyPolicyUrl', 'Privacy policy', { type: 'url' })}{field('termsUrl', 'Terms and conditions', { type: 'url' })}{field('linkedin', 'LinkedIn', { type: 'url' })}{field('instagram', 'Instagram', { type: 'url' })}{field('facebook', 'Facebook', { type: 'url' })}{field('x', 'X', { type: 'url' })}{field('youtube', 'YouTube', { type: 'url' })}{field('tiktok', 'TikTok', { type: 'url' })}{field('whatsapp', 'WhatsApp', { type: 'url' })}{field('telegram', 'Telegram', { type: 'url' })}</div>}
      {activeTab === 'legal' && <div className="profile-fields">{field('copyrightText', 'Copyright text')}{field('disclaimerShort', 'Short disclaimer', { textarea: true })}{field('disclaimerLong', 'Long disclaimer', { textarea: true })}</div>}
      {activeTab === 'brand' && <div className="profile-fields two-columns"><div>{field('logoIconUrl', 'Icon logo URL', { type: 'url' })}{form.logoIconUrl && <div className="brand-preview compact"><img src={form.logoIconUrl} alt="Icon logo preview"/></div>}</div><div>{field('logoFullUrl', 'Full logo URL', { type: 'url' })}{form.logoFullUrl && <div className="brand-preview"><img src={form.logoFullUrl} alt="Full logo preview"/></div>}</div></div>}
      {activeTab === 'platform' && <div className="platform-profile"><article><span>Platform organization</span><strong>Yes</strong></article><article><span>Owner</span><strong>{ownerEmail}</strong></article><article><span>Organization ID</span><code>{form.organizationId}</code></article><article><span>Created</span><strong>{form.createdAt ? new Date(form.createdAt).toLocaleDateString() : 'System managed'}</strong></article></div>}
      {activeTab !== 'platform' && <footer className="profile-actions"><div>{state === 'saved' && <span className="save-success">Changes saved.</span>}{state === 'error' && <span className="save-error">{error}</span>}{!canManage && <span>Only owners and administrators can edit this profile.</span>}</div><button disabled={!canManage || state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save changes'}</button></footer>}
    </form>
  </section>;
}
