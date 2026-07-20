'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * One topic inside a HelpDialog.
 *
 * heading  — short label shown in bold above the body.
 * body     — any React content: paragraphs, lists, examples, chips, etc.
 */
export interface HelpTopic {
  heading: string;
  body: React.ReactNode;
}

interface HelpDialogProps {
  /** Dialog title — typically the section name followed by "Help". */
  title: string;
  /** Ordered list of topics rendered in the dialog body. */
  topics: HelpTopic[];
  /**
   * Accessible label for the trigger icon button.
   * Defaults to `"Help for ${title}"`.
   */
  triggerLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Self-contained help dialog.
 *
 * Renders a small ℹ icon button. Clicking it opens a dialog with the
 * provided topics. Each topic has a heading and free-form body content.
 *
 * Usage:
 *   <HelpDialog
 *     title="Billing & Invoice"
 *     topics={[
 *       { heading: 'What this section is for', body: <Typography>...</Typography> },
 *       ...
 *     ]}
 *   />
 *
 * Reusable: pass any topics array — no changes to this component needed.
 */
export function HelpDialog({ title, topics, triggerLabel }: HelpDialogProps) {
  const [open, setOpen] = useState(false);
  const label = triggerLabel ?? `Help for ${title}`;

  return (
    <>
      {/* Trigger */}
      <IconButton
        size="small"
        aria-label={label}
        onClick={() => setOpen(true)}
        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
      >
        <HelpOutlineIcon fontSize="small" />
      </IconButton>

      {/* Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="help-dialog-title"
      >
        {/* Header */}
        <DialogTitle
          id="help-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <HelpOutlineIcon fontSize="small" color="primary" />
            <Typography variant="h6" component="span">
              {title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label="Close help dialog"
            onClick={() => setOpen(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        {/* Topics */}
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Box display="flex" flexDirection="column" gap={3}>
            {topics.map((topic, index) => (
              <Box key={index}>
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  gutterBottom
                  color="text.primary"
                >
                  {topic.heading}
                </Typography>
                <Box>{topic.body}</Box>
                {index < topics.length - 1 && <Divider sx={{ mt: 3 }} />}
              </Box>
            ))}
          </Box>
        </DialogContent>

        {/* Footer */}
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="contained" onClick={() => setOpen(false)}>
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
