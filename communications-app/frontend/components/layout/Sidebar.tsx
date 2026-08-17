'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import { SIDEBAR_WIDTH, TOPBAR_HEIGHT } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyById } from '@/hooks/api/useCompanies';
import { useChannelTabs } from '@/hooks/useChannelTabs';
import { getRoleConfig, type SidebarItemConfig, type SidebarSectionConfig } from '@/config/rbac/role-config';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';
import { SidebarOrgCard } from './SidebarOrgCard';
import { RelayBrand } from '@/components/brand/RelayBrand';

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
    backgroundColor: '#FBFBFD',
  },
};

function findBestMatch(pathname: string, hrefs: string[]): string | null {
  if (hrefs.includes(pathname)) return pathname;
  const prefixMatches = hrefs
    .filter((h) => pathname.startsWith(h + '/'))
    .sort((a, b) => b.length - a.length);
  return prefixMatches[0] ?? null;
}

function FlatItems({ items, bestMatch }: { items: SidebarItemConfig[]; bestMatch: string | null }) {
  return (
    <List disablePadding>
      {items.map((item) => (
        <SidebarItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          active={item.href === bestMatch}
        />
      ))}
    </List>
  );
}

// Admin-mode nav (platform_admin's "Platform" tab) — unchanged flat sections.
function AdminNav({ sections }: { sections: SidebarSectionConfig[] }) {
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
  const companyId = useAuthStore((s) => s.companyId);
  const pathname = usePathname();
  const [adminMode, setAdminMode] = useState(false);

  // Fallback org name while the organization list is still loading — works
  // for both platform_admin (Grapifly) and company-scoped roles.
  const { data: companyData } = useCompanyById(companyId);

  const config = role ? getRoleConfig(role) : null;
  const isDual = config?.navbarMode === 'dual';
  const { activeTab } = useChannelTabs();

  const topBestMatch = config ? findBestMatch(pathname, config.sidebarTop.map((i) => i.href)) : null;
  const tabBestMatch = activeTab ? findBestMatch(pathname, activeTab.items.map((i) => i.href)) : null;
  const commonBestMatch = config ? findBestMatch(pathname, config.sidebarCommon.map((i) => i.href)) : null;

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
        <RelayBrand compact />
      </Box>

      {/* Dual-mode tab switcher — only for platform_admin */}
      {isDual && (
        <Tabs
          value={adminMode ? 1 : 0}
          onChange={(_, v: number) => setAdminMode(v === 1)}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': { minHeight: 40, fontSize: '0.7rem', py: 0.5 },
          }}
        >
          <Tab label="Workspace" />
          <Tab label="Platform" />
        </Tabs>
      )}

      <Divider />

      {isDual && adminMode ? (
        // ── Platform Admin mode: unchanged flat global-admin nav ────────────
        <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5 }}>
          {config?.sidebarAdmin ? <AdminNav sections={config.sidebarAdmin} /> : null}
        </Box>
      ) : (
        // ── Business App mode: org card → Dashboard → active tab's pages → common ─
        // The channel tabs themselves render in the Topbar (see TopbarChannelTabs).
        config && (
          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Box pt={1.5}>
              <SidebarOrgCard fallbackName={companyData?.displayName} />
            </Box>

            <Box px={0} pb={1}>
              <FlatItems items={config.sidebarTop} bestMatch={topBestMatch} />
            </Box>

            {activeTab && (
              <Box sx={{ flex: 1 }}>
                <FlatItems items={activeTab.items} bestMatch={tabBestMatch} />
              </Box>
            )}

            <Divider sx={{ my: 1 }} />
            <FlatItems items={config.sidebarCommon} bestMatch={commonBestMatch} />
          </Box>
        )
      )}
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
