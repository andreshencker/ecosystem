import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';

interface ComingSoonProps {
  title: string;
}

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="40vh"
      gap={2}
      color="text.secondary"
    >
      <ConstructionOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="body2" color="text.disabled">
        This module is under construction.
      </Typography>
    </Box>
  );
}
