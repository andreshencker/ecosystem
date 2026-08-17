'use client';

import React, { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useSwitchableOrganizations } from '@/hooks/api/useOrganizations';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Redirects through Grapifly's existing SSO flow scoped to the chosen
// organization. Grapifly issues a fresh code for that org, Relay's callback
// exchanges it and re-issues a Relay JWT scoped to the new organization —
// every Relay query then automatically resolves under the new org since
// RelayTenantContextService reads org context straight from the JWT.
function switchToOrganization(organizationId: string) {
  const grapiflyIdUrl = process.env.NEXT_PUBLIC_GRAPIFLY_ID_URL ?? 'http://localhost:3101';
  window.location.href =
    `${grapiflyIdUrl.replace(/\/$/, '')}/auth/sso/relay?organizationId=${encodeURIComponent(organizationId)}`;
}

interface SidebarOrgCardProps {
  fallbackName?: string;
}

// Organization card shown at the top of the sidebar (below the brand),
// matching Grapifly's own "ORGANIZATION" card. Doubles as the switcher when
// the user has access to more than one organization.
export function SidebarOrgCard({ fallbackName }: SidebarOrgCardProps) {
  const { data } = useSwitchableOrganizations();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  const organizations = data?.organizations ?? [];
  const currentOrganizationId = data?.currentOrganizationId ?? null;
  const current = organizations.find((org) => org.organizationId === currentOrganizationId);
  const displayName = current?.name ?? fallbackName;
  const role = current?.membership?.role;

  if (!displayName) return null;

  const canSwitch = organizations.length > 1;

  return (
    <Box sx={{ px: 1.5, pb: 1.5 }}>
      <ButtonBase
        onClick={canSwitch ? (e) => setAnchorEl(e.currentTarget) : undefined}
        aria-controls={menuOpen ? 'sidebar-org-switcher-menu' : undefined}
        aria-haspopup={canSwitch ? 'true' : undefined}
        aria-expanded={menuOpen ? 'true' : undefined}
        sx={{
          width: '100%',
          display: 'block',
          textAlign: 'left',
          borderRadius: 2,
          bgcolor: 'grey.100',
          px: 1.5,
          py: 1,
          cursor: canSwitch ? 'pointer' : 'default',
          '&:hover': canSwitch ? { bgcolor: 'grey.200' } : undefined,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.4, fontSize: '0.65rem', textTransform: 'uppercase' }}>
          Organization
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mt={0.25}>
          <Box minWidth={0}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {displayName}
            </Typography>
            {role && (
              <Typography variant="caption" color="text.secondary">
                {capitalize(role)}
              </Typography>
            )}
          </Box>
          {canSwitch && (
            <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
          )}
        </Box>
      </ButtonBase>

      {canSwitch && (
        <Menu
          id="sidebar-org-switcher-menu"
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { sx: { mt: 1, minWidth: 240 } } }}
        >
          {organizations.map((org) => (
            <MenuItem
              key={org.organizationId}
              selected={org.organizationId === currentOrganizationId}
              onClick={() => {
                setAnchorEl(null);
                if (org.organizationId !== currentOrganizationId) {
                  switchToOrganization(org.organizationId);
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', fontWeight: 700 }}>
                  {getInitials(org.name)}
                </Avatar>
              </ListItemIcon>
              <ListItemText primary={org.name} />
              {org.organizationId === currentOrganizationId && (
                <CheckIcon sx={{ fontSize: 18, color: 'primary.main', ml: 1 }} />
              )}
            </MenuItem>
          ))}
        </Menu>
      )}
    </Box>
  );
}
