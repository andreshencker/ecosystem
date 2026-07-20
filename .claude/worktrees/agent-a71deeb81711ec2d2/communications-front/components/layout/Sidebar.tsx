'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { SIDEBAR_WIDTH, TOPBAR_HEIGHT } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';
import { getRoleConfig, type SidebarSectionConfig } from '@/config/rbac/role-config';
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

function findBestMatch(pathname: string, hrefs: string[]): string | null {
  if (hrefs.includes(pathname)) return pathname;
  const prefixMatches = hrefs
    .filter((h) => pathname.startsWith(h + '/'))
    .sort((a, b) => b.length - a.length);
  return prefixMatches[0] ?? null;
}

function DynamicNav({ sections }: { sections: SidebarSectionConfig[] }) {
  const pathname = usePathname();

  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const bestMatch = findBestMatch(pathname, allHrefs);

  return (
    <>
      {sections.map((section) => (
        <SidebarSection key={section.label} label={section.label}>
          {section.items.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={item.href === bestMatch}
            />
          ))}
        </SidebarSection>
      ))}
    </>
  );
}

function SidebarContent() {
  const role = useAuthStore((s) => s.role);
  const [adminMode, setAdminMode] = useState(false);

  const config = role ? getRoleConfig(role) : null;
  const isDual = config?.navbarMode === 'dual';
  const sections = isDual
    ? (adminMode ? (config?.sidebarAdmin ?? config?.sidebar) : config?.sidebar)
    : config?.sidebar;

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

      {/* Dual-mode tab switcher — only for platform_admin */}
      {isDual && (
        <>
          <Tabs
            value={adminMode ? 1 : 0}
            onChange={(_, v: number) => setAdminMode(v === 1)}
            variant="fullWidth"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': { minHeight: 40, fontSize: '0.7rem', py: 0.5 },
            }}
          >
            <Tab label="Business App" />
            <Tab label="Platform Admin" />
          </Tabs>
        </>
      )}

      <Divider />

      {/* Navigation — rendered from role-config.ts */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5 }}>
        {sections ? (
          <DynamicNav sections={sections} />
        ) : null}
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
