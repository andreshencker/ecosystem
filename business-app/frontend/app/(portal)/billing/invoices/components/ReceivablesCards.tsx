'use client';

import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { ReceivablesSummary } from '@/types/invoice';
import { formatCurrency } from '../../invoice-approval/lib/format';

export function ReceivablesCards({ summary }: { summary: ReceivablesSummary | undefined }) {
  const cards = [
    { label: 'Total income', value: summary?.totalIncome ?? '0', detail: `${summary?.invoiceCount ?? 0} invoices`, icon: <ReceiptLongOutlinedIcon /> },
    { label: 'Outstanding', value: summary?.outstanding ?? '0', detail: 'Pending collection', icon: <AccountBalanceWalletOutlinedIcon /> },
    { label: 'Paid', value: summary?.paid ?? '0', detail: 'Applied payments', icon: <PaidOutlinedIcon /> },
  ];
  return (
    <Stack direction="row" flexWrap="wrap" gap={1.5} mb={2}>
      {cards.map((card) => (
        <Paper key={card.label} variant="outlined" sx={{ p: 2, borderRadius: 2, flex: '1 1 220px' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">{card.label}</Typography>
              <Typography variant="h6" mt={0.5}>{formatCurrency(card.value, summary?.currency ?? 'AUD')}</Typography>
              <Typography variant="caption" color="text.secondary">{card.detail}</Typography>
            </Box>
            <Box sx={{ color: 'primary.main', display: 'flex' }}>{card.icon}</Box>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
