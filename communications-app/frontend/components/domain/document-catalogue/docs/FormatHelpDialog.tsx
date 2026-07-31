'use client';

import React from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';

import { PdfContractDocs } from './PdfContractDocs';
import { XlsxContractDocs } from './XlsxContractDocs';
import { CsvContractDocs } from './CsvContractDocs';
import { HtmlContractDocs } from './HtmlContractDocs';

const FORMAT_META: Record<string, { label: string; color: 'error' | 'success' | 'default' | 'primary'; description: string }> = {
  pdf:  { label: 'PDF',  color: 'error',   description: 'Structured layout document rendered by Puppeteer via ReportContentBuilder' },
  xlsx: { label: 'XLSX', color: 'success', description: 'Excel workbook rendered by ExcelJS with auto-fitted columns and optional totals block' },
  csv:  { label: 'CSV',  color: 'default', description: 'Comma-separated values exported as UTF-8 text via the CSV renderer' },
  html: { label: 'HTML', color: 'primary', description: 'HTML format — renderer not yet registered in the backend' },
};

interface FormatHelpDialogProps {
  /** The format whose help is shown. null = dialog is closed. */
  format: string | null;
  onClose: () => void;
  /** Called when the user confirms "Use Example" for a specific format. */
  onUseExample: (json: string) => void;
}

export function FormatHelpDialog({ format, onClose, onUseExample }: FormatHelpDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const meta = format ? FORMAT_META[format] : null;

  function handleUseExample(json: string) {
    onUseExample(json);
    onClose();
  }

  return (
    <Dialog
      open={Boolean(format)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="format-help-dialog-title"
      aria-describedby="format-help-dialog-description"
      PaperProps={{ sx: { maxHeight: '92vh' } }}
    >
      <DialogTitle
        id="format-help-dialog-title"
        sx={{ pb: 1.5, pr: 6 }}
        component="div"
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          {meta && (
            <Chip
              label={meta.label}
              size="small"
              color={meta.color}
              variant="outlined"
              sx={{ fontSize: '0.75rem', height: 22, fontWeight: 700 }}
            />
          )}
          <Typography variant="h6" component="span">
            Help &amp; Examples
          </Typography>
        </Box>

        {meta && (
          <Typography
            id="format-help-dialog-description"
            variant="caption"
            color="text.secondary"
            display="block"
            mt={0.5}
          >
            {meta.description}
          </Typography>
        )}

        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close help panel"
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        <Box px={3} py={2}>
          {format === 'pdf'  && <PdfContractDocs  onUseExample={handleUseExample} />}
          {format === 'xlsx' && <XlsxContractDocs onUseExample={handleUseExample} />}
          {format === 'csv'  && <CsvContractDocs  onUseExample={handleUseExample} />}
          {format === 'html' && <HtmlContractDocs />}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
