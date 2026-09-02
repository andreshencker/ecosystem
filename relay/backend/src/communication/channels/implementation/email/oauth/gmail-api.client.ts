// src/communication/channels/implementation/email/oauth/gmail-api.client.ts
//
// Thin wrapper around the real Gmail API — profile lookup + message reads.
// Every call takes a ready-to-use access token; token refresh is the
// caller's responsibility (see GmailOAuthService.ensureFreshAccessToken).

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import {
  GMAIL_API_BASE_URL,
  type GmailMessageHeader,
  type GmailMessageListResponse,
  type GmailMessageSummary,
  type GmailProfile,
} from './gmail-oauth.types';

function headerValue(
  headers: GmailMessageHeader[] | undefined,
  name: string,
): string {
  const found = headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return found?.value ?? '';
}

@Injectable()
export class GmailApiClient {
  private readonly logger = new Logger(GmailApiClient.name);

  private async request<T>(accessToken: string, path: string): Promise<T> {
    const res = await fetch(`${GMAIL_API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const message = String((errBody['error'] as any)?.message ?? res.status);
      this.logger.warn(
        `[gmail-api] GET ${path} failed: ${res.status} ${message}`,
      );

      if (res.status === 401) {
        throw new HttpException(
          'Gmail access token rejected — reconnect with Google',
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw new HttpException(
        `Gmail API request failed: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return res.json() as Promise<T>;
  }

  /** GET /users/me/profile — used both to verify a connection and to derive the displayIdentifier. */
  async getProfile(accessToken: string): Promise<GmailProfile> {
    return this.request<GmailProfile>(accessToken, '/users/me/profile');
  }

  /**
   * Lists message IDs in the mailbox (most recent first — Gmail's default order).
   * `q` supports Gmail search syntax (e.g. "in:inbox", "is:unread").
   */
  async listMessageIds(
    accessToken: string,
    params: { maxResults?: number; pageToken?: string; q?: string } = {},
  ): Promise<GmailMessageListResponse> {
    const qs = new URLSearchParams();
    qs.set('maxResults', String(params.maxResults ?? 25));
    if (params.pageToken) qs.set('pageToken', params.pageToken);
    if (params.q) qs.set('q', params.q);

    return this.request<GmailMessageListResponse>(
      accessToken,
      `/users/me/messages?${qs.toString()}`,
    );
  }

  /** GET a single message with metadata only (From/To/Subject/Date headers + snippet) — no body. */
  async getMessageSummary(
    accessToken: string,
    messageId: string,
  ): Promise<GmailMessageSummary> {
    const qs = new URLSearchParams();
    qs.set('format', 'metadata');
    ['From', 'To', 'Subject', 'Date'].forEach((h) =>
      qs.append('metadataHeaders', h),
    );

    const raw = await this.request<{
      id: string;
      threadId: string;
      snippet: string;
      internalDate: string;
      labelIds?: string[];
      payload?: { headers?: GmailMessageHeader[] };
    }>(accessToken, `/users/me/messages/${messageId}?${qs.toString()}`);

    const headers = raw.payload?.headers;

    return {
      id: raw.id,
      threadId: raw.threadId,
      snippet: raw.snippet,
      internalDate: raw.internalDate,
      labelIds: raw.labelIds,
      from: headerValue(headers, 'From'),
      to: headerValue(headers, 'To'),
      subject: headerValue(headers, 'Subject'),
      date: headerValue(headers, 'Date'),
    };
  }

  /**
   * Lists a page of messages already resolved to their metadata summary —
   * this is the shape the "emails as a table" view consumes directly.
   * Gmail has no batch-metadata endpoint, so summaries are fetched in
   * parallel per page (bounded by maxResults, default 25).
   */
  async listMessageSummaries(
    accessToken: string,
    params: { maxResults?: number; pageToken?: string; q?: string } = {},
  ): Promise<{
    messages: GmailMessageSummary[];
    nextPageToken?: string;
    resultSizeEstimate: number;
  }> {
    const list = await this.listMessageIds(accessToken, params);
    const ids = list.messages ?? [];

    const messages = await Promise.all(
      ids.map((m) => this.getMessageSummary(accessToken, m.id)),
    );

    return {
      messages,
      nextPageToken: list.nextPageToken,
      resultSizeEstimate: list.resultSizeEstimate,
    };
  }
}
