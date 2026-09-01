'use client';

import React from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useChannelTabs } from '@/hooks/useChannelTabs';

// Right-aligned in the Topbar, next to the user's avatar.
export function TopbarChannelTabs() {
  const { tabs, activeKey, selectTab } = useChannelTabs();

  if (tabs.length === 0) return null;

  return (
    <>
      <Box
        role="tablist"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          // Must be able to shrink below its content width (default flex
          // min-width is auto) — otherwise it pushes the avatar off-screen
          // on narrow viewports instead of scrolling internally.
          minWidth: 0,
          flexShrink: 1,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          const Icon = tab.icon;
          return (
            <ButtonBase
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(tab.key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                borderRadius: 1.5,
                px: { xs: 1, sm: 1.25 },
                py: 0.75,
                bgcolor: isActive ? 'action.selected' : 'transparent',
                color: isActive ? 'primary.main' : 'text.secondary',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Icon sx={{ fontSize: 16 }} />
              <Typography
                variant="body2"
                fontWeight={isActive ? 600 : 500}
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                {tab.label}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 0.5, flexShrink: 0 }} />
    </>
  );
}
