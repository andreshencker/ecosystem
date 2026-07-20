'use client';

import React from 'react';
import Box from '@mui/material/Box';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { SIDEBAR_WIDTH, TOPBAR_HEIGHT } from '@/lib/constants';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);

  const userProp = user
    ? {
        name:
          `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
        email: user.email,
      }
    : null;

  return (
    <Box display="flex" minHeight="100vh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        component="main"
        flexGrow={1}
        display="flex"
        flexDirection="column"
        sx={{
          ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
          transition: (theme) =>
            theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Topbar onMenuToggle={toggleSidebar} user={userProp} />

        <Box
          component="section"
          flexGrow={1}
          p={3}
          mt={`${TOPBAR_HEIGHT}px`}
          bgcolor="background.default"
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
