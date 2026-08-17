'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { PageHeader } from '@/components/layout';
import { EmptyState, ErrorState } from '@/components/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useAllCompanyCredentials } from '@/hooks/api/useProviderCredentials';
import { useGmailMessages } from '@/hooks/api/useGmailMessages';
import { extractApiMessage } from '@/lib/mapApiError';

// Matches GMAIL_OAUTH.oauthConfig.basePath in lib/config/provider-credential-config.ts
const GMAIL_OAUTH_BASE_PATH = '/relay/channels/oauth/gmail';
const PAGE_SIZE = 25;

function formatDate(raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function extractName(fromHeader: string): string {
  const match = fromHeader.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : fromHeader;
}

export default function EmailInboxPage() {
  const companyId = useAuthStore((s) => s.companyId);

  const { data: credsData, isLoading: credsLoading, error: credsError } = useAllCompanyCredentials(
    companyId,
    { active: true },
  );
  const mailboxes = (credsData?.items ?? []).filter(
    (c) => c.companyChannelProvider?.provider?.providerKey === 'gmail_oauth',
  );

  const [selectedId, setSelectedId] = useState('');
  const effectiveId = selectedId || mailboxes[0]?.id || '';

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  // Cursor stack — pageTokens[i] is the token that loaded page i (undefined = first page).
  const [pageTokens, setPageTokens] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const { data, isLoading, isFetching, error } = useGmailMessages(
    GMAIL_OAUTH_BASE_PATH,
    effectiveId || null,
    { maxResults: PAGE_SIZE, pageToken: pageTokens[pageIndex], q: search || undefined },
  );

  function resetPaging() {
    setPageTokens([undefined]);
    setPageIndex(0);
  }

  function handleMailboxChange(id: string) {
    setSelectedId(id);
    resetPaging();
  }

  function handleSearchSubmit() {
    setSearch(searchInput.trim());
    resetPaging();
  }

  function handleNext() {
    if (!data?.nextPageToken) return;
    setPageTokens((prev) => [...prev.slice(0, pageIndex + 1), data.nextPageToken]);
    setPageIndex((i) => i + 1);
  }

  function handlePrev() {
    setPageIndex((i) => Math.max(0, i - 1));
  }

  if (credsLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (credsError) {
    return (
      <ErrorState
        title="Could not load mailbox connections"
        description={extractApiMessage(credsError, 'Check your connection and try again.')}
      />
    );
  }

  if (mailboxes.length === 0) {
    return (
      <Box>
        <PageHeader title="Email — Inbox" subtitle="Read messages from your connected Gmail mailbox." />
        <EmptyState
          icon={MailOutlineOutlinedIcon}
          title="No Gmail mailbox connected"
          description="Connect a Gmail (OAuth) account from Credentials to read its inbox here."
        />
      </Box>
    );
  }

  const messages = data?.messages ?? [];
  const selectedMailbox = mailboxes.find((m) => m.id === effectiveId);

  return (
    <Box>
      <PageHeader title="Email — Inbox" subtitle="Read messages from your connected Gmail mailbox." />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems={{ sm: 'center' }}>
        {mailboxes.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Mailbox</InputLabel>
            <Select
              value={effectiveId}
              label="Mailbox"
              onChange={(e) => handleMailboxChange(e.target.value)}
            >
              {mailboxes.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.displayIdentifier ?? m.tag}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          size="small"
          fullWidth
          placeholder='Search — Gmail syntax, e.g. "is:unread", "from:someone@example.com"'
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      {error ? (
        <ErrorState
          title="Could not load messages"
          description={extractApiMessage(error, 'The connection may need to be reconnected from Credentials.')}
        />
      ) : (
        <Paper variant="outlined">
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={220}>From</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell width={160}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <EmptyState
                        icon={MailOutlineOutlinedIcon}
                        title="No messages"
                        description={search ? 'No messages match your search.' : 'This mailbox has no messages.'}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Tooltip title={m.from}>
                          <Typography variant="body2" noWrap maxWidth={200}>
                            {extractName(m.from)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {m.subject || '(no subject)'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {m.snippet}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {formatDate(m.date)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            px={2}
            py={1}
            sx={{ borderTop: 1, borderColor: 'divider' }}
          >
            <Typography variant="caption" color="text.secondary">
              {selectedMailbox?.displayIdentifier}
              {typeof data?.resultSizeEstimate === 'number' ? ` · ~${data.resultSizeEstimate} results` : ''}
              {isFetching && !isLoading ? ' · refreshing…' : ''}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={handlePrev} disabled={pageIndex === 0 || isFetching}>
                <ChevronLeftOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleNext} disabled={!data?.nextPageToken || isFetching}>
                <ChevronRightOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
