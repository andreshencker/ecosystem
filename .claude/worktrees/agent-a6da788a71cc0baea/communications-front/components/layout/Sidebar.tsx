'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { SIDEBAR_WIDTH, TOPBAR_HEIGHT } from '@/lib/constants';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const drawerSx = {
  width: SIDEBAR_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: SIDEBAR_WIDTH,
    boxSizing: 'border-box',
    borderRight: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper',
  },
};

function SidebarContent() {
  const pathname = usePathname();

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Logo / Brand area */}
      <Box
        sx={{
          height: TOPBAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1.5,
            flexShrink: 0,
          }}
        >
          <Typography variant="caption" color="white" fontWeight={700}>
            CP
          </Typography>
        </Box>
        <Typography variant="subtitle2" color="text.primary" fontWeight={600} noWrap>
          Communication Portal
        </Typography>
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5 }}>
        <SidebarSection label="Overview">
          <SidebarItem
            href="/dashboard"
            icon={DashboardOutlinedIcon}
            label="Dashboard"
            active={pathname === '/dashboard' || pathname.startsWith('/dashboard/')}
          />
        </SidebarSection>

        <SidebarSection label="Companies">
          <SidebarItem
            href="/companies"
            icon={BusinessOutlinedIcon}
            label="Companies"
            active={pathname === '/companies' || pathname.startsWith('/companies/')}
          />
        </SidebarSection>

        <SidebarSection label="Settings">
          <SidebarItem
            href="/settings/profile"
            icon={PersonOutlinedIcon}
            label="Profile"
            active={pathname === '/settings/profile' || pathname.startsWith('/settings/profile/')}
          />
        </SidebarSection>
      </Box>
    </Box>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop: permanent drawer */}
      <Drawer
        variant="permanent"
        sx={{
          ...drawerSx,
          display: { xs: 'none', md: 'block' },
        }}
        open
      >
        <SidebarContent />
      </Drawer>

      {/* Mobile: temporary drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          ...drawerSx,
          display: { xs: 'block', md: 'none' },
        }}
      >
        <SidebarContent />
      </Drawer>
    </>
  );
}
