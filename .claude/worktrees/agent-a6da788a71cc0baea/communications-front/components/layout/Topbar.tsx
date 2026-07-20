'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@mui/material/styles';
import { SIDEBAR_WIDTH, TOPBAR_HEIGHT, REFRESH_TOKEN_KEY } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';

interface TopbarProps {
  onMenuToggle: () => void;
  user: { name: string; email: string; avatarUrl?: string } | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Topbar({ onMenuToggle, user }: TopbarProps) {
  const theme = useTheme();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = () => {
    handleMenuClose();
    useAuthStore.getState().clearAuth();
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    router.push('/auth/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      color="inherit"
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: theme.zIndex.drawer + 1,
        height: TOPBAR_HEIGHT,
        ml: { md: `${SIDEBAR_WIDTH}px` },
        width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        backgroundColor: 'background.paper',
      }}
    >
      <Toolbar
        sx={{
          height: TOPBAR_HEIGHT,
          minHeight: `${TOPBAR_HEIGHT}px !important`,
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* Mobile menu toggle */}
        <IconButton
          edge="start"
          onClick={onMenuToggle}
          aria-label="open navigation menu"
          sx={{ display: { md: 'none' }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Spacer */}
        <Box flex={1} />

        {/* Right: user avatar */}
        {user && (
          <>
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              sx={{ cursor: 'pointer' }}
              onClick={handleAvatarClick}
              aria-controls={menuOpen ? 'topbar-user-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? 'true' : undefined}
            >
              <Avatar
                src={user.avatarUrl}
                alt={user.name}
                sx={{ width: 34, height: 34, fontSize: '0.8125rem', bgcolor: 'primary.main' }}
              >
                {getInitials(user.name)}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" fontWeight={500} lineHeight={1.2}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
                  {user.email}
                </Typography>
              </Box>
            </Box>

            <Menu
              id="topbar-user-menu"
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: { sx: { mt: 1, minWidth: 180 } },
              }}
            >
              <MenuItem
                component={Link}
                href="/settings/profile"
                onClick={handleMenuClose}
              >
                Profile
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
                Sign out
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
