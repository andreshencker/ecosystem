import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';

interface SidebarSectionProps {
  label?: string;
  children: React.ReactNode;
}

export function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <Box mb={1}>
      {label && (
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ px: 2, py: 0.5, display: 'block' }}
        >
          {label}
        </Typography>
      )}
      <List disablePadding>{children}</List>
    </Box>
  );
}
