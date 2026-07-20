'use client';

import React from 'react';
import Box from '@mui/material/Box';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { TOPBAR_HEIGHT } from '@/lib/constants';
import { useCompanyById } from '@/hooks/api/useCompanies';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen    = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const toggleSidebar  = useUIStore((s) => s.toggleSidebar);

  const user       = useAuthStore((s) => s.user);
  const companyId  = useAuthStore((s) => s.companyId);

  // Fetch the active company profile for topbar branding.
  // Works for both platform_admin (Grapifly) and company-scoped roles (their own company).
  const { data: companyData } = useCompanyById(companyId);

  const userProp = user
    ? {
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
        email: user.email,
      }
    : null;

  const companyProp = companyData
    ? {
        name: companyData.businessName,
      }
    : null;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        component="main"
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}
      >
        <Topbar onMenuToggle={toggleSidebar} user={userProp} company={companyProp} />

        {/* Spacer to push content below the fixed topbar */}
        <Box sx={{ height: `${TOPBAR_HEIGHT}px`, flexShrink: 0 }} />

        <Box
          component="section"
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
