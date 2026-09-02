'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';

type FlowOption = 'client' | 'provider';

const FLOW_COPY: Record<FlowOption, { title: string; description: string }> = {
  client: { title: 'Continue as a client', description: 'Explore and use products.' },
  provider: { title: 'Continue as a provider', description: 'Publish and sell your own products.' },
};

export default function ChooseAccountTypePage() {
  return <Suspense fallback={<main className="invitation-page"><section><BrandMark/><span className="section-kicker">Grapifly ID</span><h1>One moment…</h1><p>Loading account options.</p></section></main>}>
    <ChooseAccountTypeContent/>
  </Suspense>;
}

function ChooseAccountTypeContent() {
  const searchParams = useSearchParams();
  const app = searchParams.get('app') ?? '';
  const errorParam = searchParams.get('error');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(errorParam ? 'error' : 'loading');
  const [appName, setAppName] = useState('');
  const [flows, setFlows] = useState<FlowOption[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';

  useEffect(() => {
    if (errorParam || !app) return;
    fetch(`${apiUrl}/catalog/apps/${encodeURIComponent(app)}/public-config`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error())))
      .then((config) => {
        setAppName(config.name ?? app);
        setFlows((config.allowedFlows ?? []).filter((flow: string): flow is FlowOption => flow === 'client' || flow === 'provider'));
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [apiUrl, app, errorParam]);

  return <main className="invitation-page"><section><BrandMark/><span className="section-kicker">Grapifly ID</span>
    {state === 'loading' && <><h1>One moment…</h1><p>Loading account options.</p></>}
    {state === 'ready' && <><h1>Welcome to {appName}.</h1><p>What kind of account do you want to create?</p>
      <div className="flow-options">
        {flows.map((flow) => <a key={flow} href={`${apiUrl}/auth/complete-signup?type=${flow}&app=${encodeURIComponent(app)}`} className="flow-option">
          <strong>{FLOW_COPY[flow].title}</strong>
          <span>{FLOW_COPY[flow].description}</span>
        </a>)}
      </div>
    </>}
    {state === 'error' && <>
      <h1>{errorParam === 'expired' ? 'That took a while.' : 'Something went wrong.'}</h1>
      <p>{errorParam === 'expired' ? 'Your sign-in session expired — start again.' : 'We could not load your account options. Please try again.'}</p>
      {app && <a href={`${apiUrl}/auth/sso/${encodeURIComponent(app)}`}>Start over</a>}
    </>}
  </section></main>;
}
