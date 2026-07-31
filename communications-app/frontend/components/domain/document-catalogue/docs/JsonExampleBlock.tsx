'use client';

import React, { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useUIStore } from '@/stores/ui.store';

interface JsonExampleBlockProps {
  json: string;
  label?: string;
  maxHeight?: number;
  onUseExample?: () => void;
  useExampleLabel?: string;
}

export function JsonExampleBlock({
  json,
  label,
  maxHeight = 380,
  onUseExample,
  useExampleLabel = 'Use Example',
}: JsonExampleBlockProps) {
  const pushSnack = useUIStore((s) => s.pushSnack);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      pushSnack({ type: 'success', message: 'Example copied to clipboard' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      pushSnack({ type: 'error', message: 'Failed to copy — check browser clipboard permissions' });
    }
  }, [json, pushSnack]);

  return (
    <Box>
      {label && (
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          textTransform="uppercase"
          letterSpacing={0.5}
          display="block"
          mb={0.75}
        >
          {label}
        </Typography>
      )}

      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          fontSize: '0.775rem',
          fontFamily: '"JetBrains Mono","Fira Code","Consolas",monospace',
          lineHeight: 1.65,
          overflowX: 'auto',
          overflowY: 'auto',
          whiteSpace: 'pre',
          maxHeight,
          color: 'text.primary',
          '& ::selection': { bgcolor: 'primary.light' },
        }}
        aria-label="JSON example"
      >
        {json}
      </Box>

      <Box display="flex" gap={1} mt={1} flexWrap="wrap">
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
          onClick={handleCopy}
          aria-label="Copy JSON example to clipboard"
          sx={{ fontSize: '0.75rem' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>

        {onUseExample && (
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={onUseExample}
            aria-label={`${useExampleLabel} — replace current editor content after confirmation`}
            sx={{ fontSize: '0.75rem' }}
          >
            {useExampleLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}
