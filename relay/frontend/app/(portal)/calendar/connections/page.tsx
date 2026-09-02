'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Calendar provider credentials are managed in the general Credentials page
 * (Provider Credentials). This redirect ensures any deep-linked or bookmarked
 * URL lands in the right place.
 */
export default function CalendarConnectionsRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/provider-credentials'); }, [router]);
  return null;
}
