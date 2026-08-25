'use client';

import React from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';

interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  width?: number;
}

const DRAWER_WIDTH = 480;
const HEADER_HEIGHT = 64;
const FOOTER_HEIGHT = 72;

export function FormDrawer({
  open,
  onClose,
  title,
  children,
  actions,
  width = DRAWER_WIDTH,
}: FormDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: width },
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={3}
        height={HEADER_HEIGHT}
        flexShrink={0}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <Typography variant="h6">{title}</Typography>
        <IconButton onClick={onClose} size="small" aria-label="close drawer">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Scrollable content */}
      <Box
        flexGrow={1}
        overflow="auto"
        px={3}
        py={3}
        sx={{ pb: actions ? `${FOOTER_HEIGHT}px` : 3 }}
      >
        {children}
      </Box>

      {/* Footer actions */}
      {actions && (
        <>
          <Divider />
          <Box
            display="flex"
            justifyContent="flex-end"
            gap={1}
            px={3}
            height={FOOTER_HEIGHT}
            alignItems="center"
            flexShrink={0}
            bgcolor="background.paper"
          >
            {actions}
          </Box>
        </>
      )}
    </Drawer>
  );
}
