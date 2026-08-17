'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IdentityIndexPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/identity/documentation'); }, [router]);
  return null;
}
