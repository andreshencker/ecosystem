'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmailIndexPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/email/inbox'); }, [router]);
  return null;
}
