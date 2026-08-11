import { ReactNode } from 'react';
import { GrapiflyAppShell } from '@/components/GrapiflyAppShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <GrapiflyAppShell>{children}</GrapiflyAppShell>;
}
