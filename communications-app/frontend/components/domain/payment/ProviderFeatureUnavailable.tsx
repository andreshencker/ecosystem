import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';

export interface ProviderFeatureUnavailableProps {
  /** Human-readable page name, e.g. "Payment Methods". */
  featureDisplayName: string;
  /** Human-readable provider name, e.g. "CoinGate". */
  providerDisplayName: string;
  /** Capability status — determines title and explanation copy. */
  status: 'planned' | 'unsupported';
}

export function ProviderFeatureUnavailable({
  featureDisplayName,
  providerDisplayName,
  status,
}: ProviderFeatureUnavailableProps) {
  const isPlanned = status === 'planned';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
        gap: 1.5,
      }}
    >
      {isPlanned ? (
        <AccessTimeOutlinedIcon sx={{ fontSize: 48, color: 'info.main' }} />
      ) : (
        <BlockOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      )}

      <Typography variant="h6" fontWeight={600} color={isPlanned ? 'info.main' : 'text.secondary'}>
        {isPlanned ? 'Coming soon' : 'Feature not available'}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
        {isPlanned
          ? `${featureDisplayName} are planned for ${providerDisplayName} but are not implemented yet.`
          : `${featureDisplayName} are not available for ${providerDisplayName}.`}
      </Typography>
    </Box>
  );
}
