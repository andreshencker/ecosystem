'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';

import { FormDrawer, LoadingButton } from '@/components/shared';
import { useMarkInvoicePaidMutation, useVoidInvoiceMutation } from '@/hooks/api/useInvoices';
import type { ApprovedInvoiceListItem } from '@/types/invoice';
import { formatCurrency } from '../../invoice-approval/lib/format';
import { apiClient } from '@/lib/axios';

export function InvoicePreviewDrawer({ invoice, onClose }: { invoice: ApprovedInvoiceListItem | null; onClose: () => void }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!invoice) {
      setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
      setError(null);
      return;
    }
    let disposed = false;
    let nextUrl: string | null = null;
    setLoading(true);
    setError(null);
    setPdfUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
    apiClient.get(`/invoices/${invoice.invoiceId}/preview.pdf`, {
      responseType: 'blob',
      timeout: 60_000,
    }).then((response) => {
      if (disposed) return;
      nextUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPdfUrl(nextUrl);
    }).catch((requestError: unknown) => {
      if (disposed) return;
      setError(requestError instanceof Error ? requestError.message : 'Could not generate the invoice preview.');
    }).finally(() => { if (!disposed) setLoading(false); });
    return () => {
      disposed = true;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [invoice, reloadKey]);

  const download = () => {
    if (!pdfUrl || !invoice) return;
    const anchor = document.createElement('a');
    anchor.href = pdfUrl;
    anchor.download = `invoice-${invoice.invoiceNumber}.pdf`;
    anchor.click();
  };

  return <FormDrawer
    open={!!invoice}
    onClose={onClose}
    title={invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}
    width={960}
    actions={<>
      <Button onClick={onClose}>Close</Button>
      <Button variant="outlined" startIcon={<RefreshOutlinedIcon />} disabled={loading} onClick={() => setReloadKey((value) => value + 1)}>Regenerate</Button>
      <Button variant="contained" startIcon={<DownloadOutlinedIcon />} disabled={!pdfUrl || loading} onClick={download}>Download PDF</Button>
    </>}
  >
    <Box minHeight="calc(100vh - 184px)" display="flex" alignItems="stretch" justifyContent="center">
      {loading && <Stack alignItems="center" justifyContent="center" spacing={2} flex={1}><CircularProgress /><Typography color="text.secondary">Generating invoice preview…</Typography></Stack>}
      {!loading && error && <Stack spacing={2} alignItems="center" justifyContent="center" flex={1}><Alert severity="error" sx={{ width: '100%' }}>{error}</Alert><Button startIcon={<RefreshOutlinedIcon />} onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></Stack>}
      {!loading && !error && pdfUrl && <Box component="iframe" title={`Invoice ${invoice?.invoiceNumber ?? ''} PDF preview`} src={pdfUrl} sx={{ width: '100%', minHeight: 'calc(100vh - 184px)', border: 0, bgcolor: 'grey.100', borderRadius: 1 }} />}
    </Box>
  </FormDrawer>;
}

export function MarkPaidDrawer({ invoice, onClose }: { invoice: ApprovedInvoiceListItem | null; onClose: () => void }) {
  const mutation = useMarkInvoicePaidMutation();
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => { if (invoice) { setPaidAt(new Date().toISOString().slice(0, 10)); setReference(''); setNotes(''); } }, [invoice]);
  const submit = () => invoice && paidAt && mutation.mutate({ invoiceId: invoice.invoiceId, paidAt, reference: reference || undefined, notes: notes || undefined }, { onSuccess: onClose });
  return <FormDrawer open={!!invoice} onClose={onClose} title="Mark Invoice as Paid" actions={<><Button onClick={onClose}>Cancel</Button><LoadingButton variant="contained" loading={mutation.isPending} disabled={!paidAt} onClick={submit}>Mark as Paid</LoadingButton></>}>
    {invoice && <Stack spacing={2}><TextField label="Invoice" value={invoice.invoiceNumber} disabled /><TextField label="Amount" value={formatCurrency(invoice.balance, invoice.currency)} disabled /><TextField label="Payment date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} inputProps={{ max: new Date().toISOString().slice(0, 10) }} InputLabelProps={{ shrink: true }} required helperText="Date the payment was received." /><TextField label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} /><TextField label="Notes" multiline minRows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Stack>}
  </FormDrawer>;
}

export function VoidInvoiceDrawer({ invoice, onClose }: { invoice: ApprovedInvoiceListItem | null; onClose: () => void }) {
  const mutation = useVoidInvoiceMutation();
  const [reason, setReason] = useState('');
  useEffect(() => { if (invoice) setReason(''); }, [invoice]);
  const submit = () => invoice && mutation.mutate({ invoiceId: invoice.invoiceId, reason }, { onSuccess: onClose });
  return <FormDrawer open={!!invoice} onClose={onClose} title="Void Invoice" actions={<><Button onClick={onClose}>Cancel</Button><LoadingButton color="error" variant="contained" loading={mutation.isPending} disabled={!reason.trim()} onClick={submit}>Void Invoice</LoadingButton></>}>
    <TextField fullWidth label="Reason" multiline minRows={4} value={reason} onChange={(e) => setReason(e.target.value)} required helperText="The invoice remains in the audit history." />
  </FormDrawer>;
}
