'use client';

// Gmail mailbox read access — only gmail_oauth credentials support this
// (SMTP/Mailgun/SendGrid are send-only). Takes `oauthBasePath` like the
// generic OAuth connection hooks so a future read-capable email provider
// could reuse the same shape.

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  labelIds?: string[];
  from: string;
  to: string;
  subject: string;
  date: string;
}

export interface GmailMessagesResult {
  messages: GmailMessageSummary[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailMessagesParams {
  maxResults?: number;
  pageToken?: string;
  /** Gmail search syntax, e.g. "in:inbox", "is:unread". */
  q?: string;
}

/**
 * Lists a page of mailbox messages (metadata only — From/To/Subject/Date/
 * snippet, no body) for a connected Gmail account.
 *
 * @param oauthBasePath e.g. '/relay/channels/oauth/gmail'
 * @param credentialId  ProviderCredentials._id of the connected mailbox
 */
export function useGmailMessages(
  oauthBasePath: string | null | undefined,
  credentialId: string | null | undefined,
  params: GmailMessagesParams = {},
) {
  return useQuery({
    queryKey: ['gmail-messages', oauthBasePath, credentialId, params],
    queryFn: () =>
      apiClient
        .get<GmailMessagesResult>(
          `${oauthBasePath}/connections/${credentialId}/messages`,
          { params },
        )
        .then((r) => r.data),
    enabled: Boolean(oauthBasePath && credentialId),
    staleTime: 30_000,
  });
}
