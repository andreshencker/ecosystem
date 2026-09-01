'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

export interface OrganizationProfile {
  organizationId: string; name: string; slug: string; status: 'active' | 'suspended' | 'archived'; isPlatform: boolean;
  entityType: 'company' | 'individual';
  legalName: string; tagline: string; timezone: string;
  officialEmail: string; supportEmail: string; supportPhoneCountryCode: string; supportPhoneNumber: string; supportHours: string;
  addressLine1: string; addressLine2: string; addressCity: string; addressState: string; addressPostalCode: string; addressCountry: string;
  websiteUrl: string; apiBaseUrl: string; helpCenterUrl: string; privacyPolicyUrl: string; termsUrl: string; unsubscribeUrl: string;
  facebook: string; instagram: string; linkedin: string; x: string; youtube: string; tiktok: string; whatsapp: string; telegram: string;
  copyrightText: string; disclaimerShort: string; disclaimerLong: string; logoIconUrl: string; logoFullUrl: string;
  bankAccountHolder: string; bankName: string; bankAccountNumber: string; bankSwiftBic: string; bankCountry: string;
  usdtWalletAddress: string; usdtNetwork: '' | 'TRC20' | 'ERC20' | 'BEP20';
  createdAt?: string; updatedAt?: string;
}

type TabKey = 'general' | 'contact' | 'payment' | 'web';

const TAB_FIELDS: Record<TabKey, (keyof OrganizationProfile)[]> = {
  general: ['name', 'entityType', 'legalName', 'tagline', 'timezone', 'copyrightText', 'disclaimerShort', 'disclaimerLong', 'logoIconUrl', 'logoFullUrl'],
  contact: ['officialEmail', 'supportEmail', 'supportPhoneCountryCode', 'supportPhoneNumber', 'supportHours', 'addressLine1', 'addressLine2', 'addressCity', 'addressState', 'addressPostalCode', 'addressCountry'],
  payment: ['bankAccountHolder', 'bankName', 'bankAccountNumber', 'bankSwiftBic', 'bankCountry', 'usdtWalletAddress', 'usdtNetwork'],
  web: ['websiteUrl', 'apiBaseUrl', 'helpCenterUrl', 'privacyPolicyUrl', 'termsUrl', 'unsubscribeUrl', 'facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'whatsapp', 'telegram'],
};

const TABS: [TabKey, string][] = [
  ['general', 'General'],
  ['contact', 'Contact & Address'],
  ['payment', 'Payment'],
  ['web', 'Web & Social'],
];

const TIMEZONES = ['UTC', 'Australia/Sydney', 'Australia/Melbourne', 'America/New_York', 'America/Los_Angeles', 'America/Bogota', 'Europe/London', 'Europe/Madrid', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo'];
const USDT_NETWORKS = ['TRC20', 'ERC20', 'BEP20'] as const;

export function OrganizationProfileTabs({ organization, canManage, apiUrl, onSaved }: {
  organization: OrganizationProfile;
  canManage: boolean;
  apiUrl: string;
  onSaved: (organization: OrganizationProfile) => void;
}) {
  const tabs = useMemo(() => TABS, []);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [form, setForm] = useState<OrganizationProfile>(organization);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(organization); setState('idle'); setError('');
  }, [organization]);

  function set<K extends keyof OrganizationProfile>(name: K, value: OrganizationProfile[K]) {
    setForm((current) => ({ ...current, [name]: value }));
    setState('idle');
  }

  function field(name: keyof OrganizationProfile, label: string, options: { type?: string; placeholder?: string; textarea?: boolean; required?: boolean } = {}) {
    const value = String(form[name] ?? '');
    return <label className="profile-field" key={name}>
      <span>{label}{options.required && <b> *</b>}</span>
      {options.textarea
        ? <textarea value={value} disabled={!canManage} placeholder={options.placeholder} onChange={(event) => set(name, event.target.value as never)} />
        : <input type={options.type ?? 'text'} value={value} disabled={!canManage} required={options.required} placeholder={options.placeholder} onChange={(event) => set(name, event.target.value as never)} />}
    </label>;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setState('saving'); setError('');
    const payload = Object.fromEntries(TAB_FIELDS[activeTab].map((key) => [key, form[key] ?? '']));
    try {
      const response = await fetch(`${apiUrl}/organizations/${organization.organizationId}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setState('error'); setError(data?.message ?? 'Changes could not be saved.'); return; }
      setForm((current) => ({ ...current, ...data }));
      onSaved({ ...form, ...data });
      setState('saved');
    } catch {
      setState('error'); setError('Changes could not be saved.');
    }
  }

  return <section className="organization-profile-card">
    <nav className="profile-tabs" aria-label="Organization profile sections">
      {tabs.map(([key, label]) => (
        <button type="button" key={key} className={activeTab === key ? 'active' : ''} onClick={() => { setActiveTab(key); setState('idle'); setError(''); }}>{label}</button>
      ))}
    </nav>

    <form onSubmit={save}>
      {activeTab === 'general' && <div className="profile-fields two-columns">
        {field('name', 'Organization name', { required: true })}
        <label className="profile-field"><span>Type</span>
          <select disabled={!canManage} value={form.entityType} onChange={(event) => set('entityType', event.target.value as OrganizationProfile['entityType'])}>
            <option value="company">Company</option>
            <option value="individual">Individual</option>
          </select>
        </label>
        {field('legalName', 'Legal name')}
        {field('tagline', 'Tagline')}
        <label className="profile-field"><span>Timezone</span>
          <select disabled={!canManage} value={form.timezone || 'Australia/Sydney'} onChange={(event) => set('timezone', event.target.value)}>
            {TIMEZONES.map((timezone) => <option key={timezone}>{timezone}</option>)}
          </select>
        </label>
        <label className="profile-field"><span>Organization key</span><input value={form.slug} readOnly /></label>
        <label className="profile-field"><span>Status</span><input value={form.status} readOnly /></label>
        {field('logoIconUrl', 'Icon logo URL', { type: 'url', placeholder: 'https://' })}
        {field('logoFullUrl', 'Full logo URL', { type: 'url', placeholder: 'https://' })}
        {field('copyrightText', 'Copyright text')}
        {field('disclaimerShort', 'Short disclaimer', { textarea: true })}
        {field('disclaimerLong', 'Long disclaimer', { textarea: true })}
      </div>}

      {activeTab === 'contact' && <div className="profile-fields two-columns">
        {field('officialEmail', 'Official email', { type: 'email' })}
        {field('supportEmail', 'Support email', { type: 'email' })}
        <label className="profile-field"><span>Support phone</span>
          <div className="phone-input-group">
            <input value={form.supportPhoneCountryCode} disabled={!canManage} placeholder="+61" onChange={(event) => set('supportPhoneCountryCode', event.target.value)} />
            <input value={form.supportPhoneNumber} disabled={!canManage} placeholder="Phone number" onChange={(event) => set('supportPhoneNumber', event.target.value)} />
          </div>
        </label>
        {field('supportHours', 'Support hours', { placeholder: 'Monday–Friday, 9:00–17:00' })}
        {field('addressLine1', 'Address line 1')}
        {field('addressLine2', 'Address line 2')}
        {field('addressCity', 'City')}
        {field('addressState', 'State / Province')}
        {field('addressPostalCode', 'Postal code')}
        {field('addressCountry', 'Country')}
      </div>}

      {activeTab === 'payment' && <div className="profile-fields two-columns">
        {field('bankAccountHolder', 'Bank account holder')}
        {field('bankName', 'Bank name')}
        {field('bankAccountNumber', 'Account number / IBAN')}
        {field('bankSwiftBic', 'SWIFT / BIC')}
        {field('bankCountry', 'Bank country')}
        {field('usdtWalletAddress', 'USDT wallet address')}
        <label className="profile-field"><span>USDT network</span>
          <select disabled={!canManage} value={form.usdtNetwork} onChange={(event) => set('usdtNetwork', event.target.value as OrganizationProfile['usdtNetwork'])}>
            <option value="">Select network…</option>
            {USDT_NETWORKS.map((network) => <option key={network} value={network}>{network}</option>)}
          </select>
        </label>
      </div>}

      {activeTab === 'web' && <div className="profile-fields two-columns">
        {field('websiteUrl', 'Website', { type: 'url', placeholder: 'https://' })}
        {field('apiBaseUrl', 'API base URL', { type: 'url', placeholder: 'https://' })}
        {field('helpCenterUrl', 'Help center', { type: 'url', placeholder: 'https://' })}
        {field('privacyPolicyUrl', 'Privacy policy', { type: 'url', placeholder: 'https://' })}
        {field('termsUrl', 'Terms and conditions', { type: 'url', placeholder: 'https://' })}
        {field('unsubscribeUrl', 'Unsubscribe URL', { type: 'url', placeholder: 'https://' })}
        {field('facebook', 'Facebook', { type: 'url', placeholder: 'https://' })}
        {field('instagram', 'Instagram', { type: 'url', placeholder: 'https://' })}
        {field('linkedin', 'LinkedIn', { type: 'url', placeholder: 'https://' })}
        {field('x', 'X', { type: 'url', placeholder: 'https://' })}
        {field('youtube', 'YouTube', { type: 'url', placeholder: 'https://' })}
        {field('tiktok', 'TikTok', { type: 'url', placeholder: 'https://' })}
        {field('whatsapp', 'WhatsApp', { type: 'url', placeholder: 'https://' })}
        {field('telegram', 'Telegram', { type: 'url', placeholder: 'https://' })}
      </div>}

      {activeTab === 'general' && form.logoFullUrl && (
        <div className="brand-preview"><img src={form.logoFullUrl} alt="Full logo preview" /></div>
      )}

      <footer className="profile-actions">
        <div>
          {state === 'saved' && <span className="save-success">Changes saved.</span>}
          {state === 'error' && <span className="save-error">{error}</span>}
          {!canManage && <span>Only owners and administrators can edit this profile.</span>}
        </div>
        <button disabled={!canManage || state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save changes'}</button>
      </footer>
    </form>
  </section>;
}
