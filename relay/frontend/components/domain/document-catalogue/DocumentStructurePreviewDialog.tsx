'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';

import { usePreviewDocumentStructurePdfMutation } from '@/hooks/api/useDocumentCatalogue';
import { extractApiMessage } from '@/lib/mapApiError';
import type { DocumentCatalogue, DocumentDomainCatalogue } from '@/types/api';

interface DocumentStructurePreviewDialogProps {
  open: boolean;
  doc: DocumentCatalogue | null;
  companyId: string;
  onClose: () => void;
}

function getDomainInfo(doc: DocumentCatalogue): { domainKey: string; domainName: string } {
  if (typeof doc.documentDomainCatalogueId === 'object' && doc.documentDomainCatalogueId !== null) {
    const d = doc.documentDomainCatalogueId as DocumentDomainCatalogue;
    return { domainKey: d.domainKey ?? '', domainName: d.displayName ?? '' };
  }
  return { domainKey: '', domainName: '' };
}

/** Extract the backend message from a response whose body arrived as a Blob (responseType: 'blob'). */
async function extractBlobErrorMessage(err: unknown, fallback: string): Promise<string> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      const text = await (err.response.data as Blob).text();
      const parsed = JSON.parse(text) as { message?: unknown };
      const msg = Array.isArray(parsed.message)
        ? parsed.message.join(', ')
        : typeof parsed.message === 'string' && parsed.message
          ? parsed.message
          : null;
      if (msg) return msg;
    } catch { /* fall through */ }
  }
  return extractApiMessage(err, fallback);
}

export function DocumentStructurePreviewDialog({
  open,
  doc,
  companyId,
  onClose,
}: DocumentStructurePreviewDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const mutation = usePreviewDocumentStructurePdfMutation();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  const { domainKey, domainName } = doc ? getDomainInfo(doc) : { domainKey: '', domainName: '' };
  const canonicalKey = doc ? `${domainKey}.${doc.documentKey}.pdf` : '';

  function revokeUrl(url: string | null) {
    if (url) URL.revokeObjectURL(url);
  }

  const generate = useCallback(() => {
    if (!doc) return;
    setErrorMsg(null);
    revokeUrl(prevUrlRef.current);
    prevUrlRef.current = null;
    setPdfUrl(null);

    mutation.mutate(
      { companyId, canonicalKey },
      {
        onSuccess: (blob) => {
          // Normalise MIME type — Axios sets it from Content-Type but guard against empty string.
          const pdfBlob =
            blob.type === 'application/pdf'
              ? blob
              : new Blob([blob], { type: 'application/pdf' });
          const url = URL.createObjectURL(pdfBlob);
          prevUrlRef.current = url;
          setPdfUrl(url);
        },
        onError: async (err) => {
          const msg = await extractBlobErrorMessage(err, 'Failed to generate structural preview.');
          setErrorMsg(msg);
        },
      },
    );
  }, [doc, companyId, canonicalKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate when dialog opens or document changes
  useEffect(() => {
    if (open && doc) generate();
    if (!open) {
      revokeUrl(prevUrlRef.current);
      prevUrlRef.current = null;
      setPdfUrl(null);
      setErrorMsg(null);
    }
  }, [open, doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => { revokeUrl(prevUrlRef.current); };
  }, []);

  function handleDownload() {
    if (!pdfUrl || !doc) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${doc.documentKey}-structure-preview.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleOpenInNewTab() {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  }

  const isLoading = mutation.isPending;
  const hasUrl = Boolean(pdfUrl);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="doc-preview-title"
      aria-describedby="doc-preview-desc"
      PaperProps={{ sx: { maxHeight: '96vh', display: 'flex', flexDirection: 'column' } }}
    >
      {/* ── Title ── */}
      <DialogTitle id="doc-preview-title" component="div" sx={{ pb: 1.5, pr: 7 }}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Chip label="PDF" size="small" color="error" variant="outlined" sx={{ fontSize: '0.72rem', height: 22, fontWeight: 700 }} />
          <Typography variant="h6" component="span" noWrap>
            {doc?.displayName ?? 'Document'} — Structure Preview
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
          {domainName && (
            <Typography variant="caption" color="text.secondary">{domainName}</Typography>
          )}
          {domainKey && doc && (
            <Typography variant="caption" fontFamily="monospace" color="text.disabled" noWrap>
              {canonicalKey}
            </Typography>
          )}
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close preview"
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* ── Content ── */}
      <DialogContent id="doc-preview-desc" sx={{ p: 0 }}>
        {/* Disclaimer */}
        <Box px={2.5} pt={1.5} pb={1}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            <Typography variant="caption">
              <strong>Structural preview</strong> — placeholder values are used to show layout and theme. No business data is included.
              Table headers and section titles come from the stored contract definition.
            </Typography>
          </Alert>
        </Box>

        {/*
          ── PDF viewer container ───────────────────────────────────────────────
          Explicit height is required so that height: 100% on <object> resolves
          to a concrete pixel value.  Relying solely on flexGrow: 1 without an
          explicit height does not establish a resolved percentage-height base
          for statically-positioned children.

          object-src blob: must be present in the CSP (next.config.js) for the
          <object> element to load blob: URLs.  Previously 'object-src none'
          blocked the embed and produced Chrome's broken-file icon even though
          the Blob URL itself was valid (Open PDF and Download work through
          top-level navigation which is not governed by object-src / frame-src).
        */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: { xs: 'calc(100vh - 220px)', sm: '68vh', md: '72vh' },
            minHeight: 420,
            overflow: 'hidden',
            bgcolor: '#f5f5f5',
          }}
        >
          {/* Generation loading overlay */}
          {isLoading && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, zIndex: 1 }}>
              <CircularProgress size={36} />
              <Typography variant="caption" color="text.secondary">Generating structural preview…</Typography>
            </Box>
          )}

          {/* Generation / backend error */}
          {!isLoading && errorMsg && (
            <Box p={3}>
              <Alert severity="error">
                <Typography variant="body2" fontWeight={600} mb={0.5}>Preview failed</Typography>
                <Typography variant="caption">{errorMsg}</Typography>
              </Alert>
              {errorMsg.toLowerCase().includes('pdf layout') && (
                <Stack mt={1.5} spacing={0.5}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    To fix this: navigate to <strong>Layout Templates</strong> and create a PDF template, then set it as the company default.
                  </Typography>
                </Stack>
              )}
            </Box>
          )}

          {/* PDF embedded viewer — <object> with blob: URL.
              object-src blob: must be in the CSP for this to render.
              Fallback content is shown if the browser cannot embed the PDF. */}
          {!isLoading && !errorMsg && hasUrl && (
            <object
              key={pdfUrl}
              data={pdfUrl ?? ''}
              type="application/pdf"
              style={{ width: '100%', height: '100%', display: 'block', border: 0 }}
              aria-label="PDF structure preview"
            >
              {/* Browser cannot embed — PDF was generated; provide direct access buttons */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 3,
                  gap: 2,
                }}
              >
                <Alert severity="warning" sx={{ width: '100%', maxWidth: 480 }}>
                  <Typography variant="body2" fontWeight={600} mb={0.25}>Embedded viewer unavailable</Typography>
                  <Typography variant="caption">
                    The PDF was generated successfully but could not be displayed in the embedded viewer.
                    Use Open PDF or Download to view the file.
                  </Typography>
                </Alert>
                <Box display="flex" gap={1.5}>
                  <Button variant="outlined" size="small" startIcon={<OpenInNewOutlinedIcon fontSize="small" />} onClick={handleOpenInNewTab}>
                    Open PDF
                  </Button>
                  <Button variant="outlined" size="small" startIcon={<DownloadOutlinedIcon fontSize="small" />} onClick={handleDownload}>
                    Download PDF
                  </Button>
                </Box>
              </Box>
            </object>
          )}
        </Box>
      </DialogContent>

      {/* ── Actions ── */}
      <Divider />
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshOutlinedIcon fontSize="small" />}
          onClick={generate}
          disabled={isLoading}
          aria-label="Refresh structural preview"
        >
          Refresh
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          size="small"
          variant="outlined"
          startIcon={<OpenInNewOutlinedIcon fontSize="small" />}
          onClick={handleOpenInNewTab}
          disabled={!hasUrl}
          aria-label="Open PDF in new tab"
        >
          Open PDF
        </Button>

        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadOutlinedIcon fontSize="small" />}
          onClick={handleDownload}
          disabled={!hasUrl}
          aria-label="Download structural preview PDF"
        >
          Download
        </Button>

        <Button size="small" variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
