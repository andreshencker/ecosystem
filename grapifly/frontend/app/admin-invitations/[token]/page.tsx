'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';

export default function AcceptAdminInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'accepting' | 'accepted' | 'signin' | 'error'>('accepting');
  const apiUrl = process.env.NEXT_PUBLIC_ID_API_URL ?? 'http://localhost:3101';
  useEffect(() => {
    fetch(`${apiUrl}/admin/invitations/accept`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((response) => { if (response.status === 401) { setState('signin'); return null; } if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => { if (data) setState('accepted'); })
      .catch(() => setState('error'));
  }, [apiUrl, token]);
  return <main className="invitation-page"><section><BrandMark/><span className="section-kicker">Grapifly invitation</span>{state === 'accepting' && <><h1>Joining the admin team…</h1><p>Grapifly is verifying your identity and invitation.</p></>}{state === 'accepted' && <><h1>You’re in.</h1><p>Your ecosystem administration access is now active.</p><a href="/home">Go to Grapifly</a></>}{state === 'signin' && <><h1>Sign in first.</h1><p>Use the Google account matching the invited email. Grapifly will return you to this invitation automatically.</p><a href={`${apiUrl}/auth/google/admin-invitation/${encodeURIComponent(token)}`}>Continue with Google</a></>}{state === 'error' && <><h1>Invitation unavailable.</h1><p>The link may have expired, been used or belong to another account.</p><a href="/home">Return to Grapifly</a></>}</section></main>;
}
