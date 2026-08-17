// src/communication/channels/implementation/email/oauth/gmail-oauth.controller.ts
//
// Gmail OAuth 2.0 connection lifecycle + mailbox read endpoints.
//
// Route summary:
//   POST /relay/channels/oauth/gmail/start                          — start OAuth flow
//   GET  /relay/channels/oauth/gmail/callback                       — public OAuth callback
//   GET  /relay/channels/oauth/gmail/connections/:credentialId/status    — verify connection
//   GET  /relay/channels/oauth/gmail/connections/:credentialId/messages  — list mailbox messages
//
// Security model (mirrors XeroOAuthController):
//   - All routes except /callback require a valid JWT.
//   - /callback is @Public() because Google calls it without our JWT.
//     CSRF protection is provided by the server-side state validated on entry.
//   - Company isolation is enforced on every authenticated route via companyId
//     from the JWT AuthContext — never from request body or query params.
//   - State is stored server-side in Redis (single-use).

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

import { Public } from '../../../../../infrastructure/security/decorators/public.decorator';
import { CurrentUser } from '../../../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../../../infrastructure/security/types/auth-context.types';

import { GmailOAuthService } from './gmail-oauth.service';
import { GmailApiClient } from './gmail-api.client';
import type {
  GmailConnectionStatus,
  GmailMessageSummary,
} from './gmail-oauth.types';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class StartGmailOAuthDto {
  @IsMongoId()
  providerCredentialsId!: string;

  @IsOptional()
  @IsString()
  returnPath?: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Email — Gmail OAuth')
@Controller('relay/channels/oauth/gmail')
export class GmailOAuthController {
  private readonly logger = new Logger(GmailOAuthController.name);

  constructor(
    private readonly oauthService: GmailOAuthService,
    private readonly gmailApi: GmailApiClient,
  ) {}

  // ─── POST /relay/channels/oauth/gmail/start ─────────────────────────

  /**
   * Initiates the Google OAuth 2.0 authorization flow for a Gmail mailbox.
   *
   * Same model as Xero: reads the company-owned clientId from the
   * ProviderCredentials record (entered in the credential form) and uses it
   * to build the Google authorization URL.
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start Gmail OAuth authorization',
    description:
      'Returns the Google authorization URL. The client should redirect the ' +
      'user to this URL. Requires an existing ProviderCredentials record with ' +
      "the company's Google OAuth clientId and clientSecret.",
  })
  async startOAuth(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: StartGmailOAuthDto,
  ): Promise<{ authorizationUrl: string }> {
    const companyId = this.requireCompanyId(ctx);

    const credResult = await this.oauthService.readDecryptedCredential({
      credentialId: dto.providerCredentialsId,
      companyId,
    });

    if (!credResult) {
      throw new NotFoundException(
        'Credential not found or does not belong to this company. ' +
          'Create a Gmail (OAuth) credential with your clientId and clientSecret first.',
      );
    }

    const { decrypted } = credResult;

    const { clientId } = await this.oauthService.resolveClientCredentials(
      decrypted,
      companyId,
    );

    const { authorizationUrl } = await this.oauthService.buildAuthorizationUrl({
      companyId,
      providerCredentialsId: dto.providerCredentialsId,
      clientId,
      returnPath: dto.returnPath,
    });

    this.logger.log(
      `[gmail-oauth] Authorization started: companyId=${companyId} ` +
        `credentialId=${dto.providerCredentialsId}`,
    );

    return { authorizationUrl };
  }

  // ─── GET /relay/channels/oauth/gmail/callback ───────────────────────

  /**
   * Public OAuth callback — Google redirects here after user consent.
   * Validates state (CSRF), exchanges code (PKCE), looks up the mailbox
   * address via the Gmail profile endpoint, persists tokens, redirects.
   */
  @Public()
  @Get('callback')
  @Redirect()
  @ApiOperation({
    summary: 'Gmail OAuth callback (public)',
    description:
      'Receives the Google authorization code. Validates state (CSRF), ' +
      'exchanges code for tokens (PKCE), reads the mailbox address, and redirects.',
  })
  async handleCallback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ): Promise<{ url: string; statusCode: number }> {
    const redirect = (url: string) => ({ url, statusCode: HttpStatus.FOUND });

    if (error || !code || !state) {
      const reason = error ?? 'Authorization code or state missing';
      this.logger.warn(`[gmail-cb] Callback received with error: ${reason}`);
      return redirect(this.oauthService.buildErrorRedirectUrl(reason));
    }

    const stateData = await this.oauthService.consumeOAuthState(state);
    if (!stateData) {
      this.logger.warn(
        '[gmail-cb] Invalid or expired state — possible CSRF or replay attempt',
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Invalid or expired authorization state — please try again',
        ),
      );
    }

    const { companyId, providerCredentialsId, codeVerifier, returnPath } =
      stateData;

    const existingCreds = await this.oauthService.readAndDecryptCredential(
      providerCredentialsId,
    );

    if (!existingCreds) {
      this.logger.warn(
        `[gmail-cb] Could not read credential ${providerCredentialsId} for code exchange`,
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Credential not found — the Gmail connection setup may have been deleted',
        ),
      );
    }

    let clientId: string;
    let clientSecret: string;
    try {
      ({ clientId, clientSecret } =
        await this.oauthService.resolveClientCredentials(
          existingCreds,
          companyId,
        ));
    } catch (err: any) {
      this.logger.warn(
        `[gmail-cb] Could not resolve client credentials for ${providerCredentialsId}: ${err?.message}`,
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Could not resolve the Google app credentials for this connection',
        ),
      );
    }

    let tokenResponse;
    try {
      tokenResponse = await this.oauthService.exchangeAuthorizationCode({
        code,
        codeVerifier,
        clientId,
        clientSecret,
      });
    } catch (err: any) {
      const reason = String(err?.message ?? 'Token exchange failed');
      this.logger.warn(`[gmail-cb] Code exchange failed: ${reason}`);
      return redirect(this.oauthService.buildErrorRedirectUrl(reason));
    }

    let emailAddress: string;
    try {
      const profile = await this.gmailApi.getProfile(
        tokenResponse.access_token,
      );
      emailAddress = profile.emailAddress;
    } catch (err: any) {
      this.logger.warn(
        `[gmail-cb] Failed to read Gmail profile after code exchange: ${err?.message}`,
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Connected to Google but could not read the mailbox profile — please try again',
        ),
      );
    }

    try {
      await this.oauthService.persistTokens({
        credentialId: providerCredentialsId,
        tokenResponse,
        emailAddress,
      });
    } catch (err: any) {
      this.logger.error(`[gmail-cb] Failed to persist tokens: ${err?.message}`);
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Failed to save the Gmail connection — please try again',
        ),
      );
    }

    this.logger.log(
      `[gmail-cb] Connection complete: credentialId=${providerCredentialsId} emailAddress=${emailAddress}`,
    );

    return redirect(
      this.oauthService.buildSuccessRedirectUrl({
        credentialId: providerCredentialsId,
        returnPath,
      }),
    );
  }

  // ─── GET .../connections/:credentialId/status ────────────────────────────────

  /** Verifies a Gmail connection by reading the mailbox profile (non-destructive). */
  @Get('connections/:credentialId/status')
  @ApiOperation({
    summary: 'Verify Gmail connection status',
    description:
      'Calls the Gmail profile endpoint to confirm the connection is live. ' +
      'Returns canonical status only — never tokens.',
  })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async getConnectionStatus(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
  ): Promise<GmailConnectionStatus> {
    const companyId = this.requireCompanyId(ctx);
    const checkedAt = new Date().toISOString();

    const credResult = await this.oauthService.readDecryptedCredential({
      credentialId,
      companyId,
    });

    if (!credResult) {
      throw new NotFoundException(
        'Credential not found or does not belong to this company',
      );
    }

    const { decrypted } = credResult;

    if (!decrypted.accessToken && !decrypted.refreshToken) {
      return {
        connected: false,
        providerKey: 'gmail_oauth',
        emailAddress: null,
        grantedScopes: null,
        tokenExpiresAt: null,
        checkedAt,
        reason: 'Not connected yet — click "Connect with Google"',
      };
    }

    try {
      const accessToken = await this.oauthService.ensureFreshAccessToken({
        credentialId,
        companyId,
        decrypted,
      });
      const profile = await this.gmailApi.getProfile(accessToken);

      return {
        connected: true,
        providerKey: 'gmail_oauth',
        emailAddress: profile.emailAddress,
        grantedScopes: decrypted.scopes?.join(' ') ?? null,
        tokenExpiresAt: decrypted.expiresAt ?? null,
        checkedAt,
      };
    } catch (err: any) {
      return {
        connected: false,
        providerKey: 'gmail_oauth',
        emailAddress: decrypted.emailAddress ?? null,
        grantedScopes: decrypted.scopes?.join(' ') ?? null,
        tokenExpiresAt: decrypted.expiresAt ?? null,
        checkedAt,
        reason: String(err?.message ?? 'Connection check failed'),
      };
    }
  }

  // ─── GET .../connections/:credentialId/messages ──────────────────────────────

  /** Lists mailbox messages (metadata only — From/To/Subject/Date/snippet) as a table. */
  @Get('connections/:credentialId/messages')
  @ApiOperation({
    summary: 'List Gmail messages',
    description:
      'Returns a page of mailbox messages (metadata only, no body) for the ' +
      'connected Gmail account. Supports Gmail search syntax via `q` ' +
      '(e.g. "in:inbox", "is:unread").',
  })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async listMessages(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
    @Query('maxResults') maxResults?: string,
    @Query('pageToken') pageToken?: string,
    @Query('q') q?: string,
  ): Promise<{
    messages: GmailMessageSummary[];
    nextPageToken?: string;
    resultSizeEstimate: number;
  }> {
    const companyId = this.requireCompanyId(ctx);

    const credResult = await this.oauthService.readDecryptedCredential({
      credentialId,
      companyId,
    });

    if (!credResult) {
      throw new NotFoundException(
        'Credential not found or does not belong to this company',
      );
    }

    const accessToken = await this.oauthService.ensureFreshAccessToken({
      credentialId,
      companyId,
      decrypted: credResult.decrypted,
    });

    const parsedMax = maxResults ? Number(maxResults) : undefined;

    return this.gmailApi.listMessageSummaries(accessToken, {
      maxResults:
        parsedMax && Number.isFinite(parsedMax)
          ? Math.min(Math.max(parsedMax, 1), 100)
          : undefined,
      pageToken,
      q,
    });
  }

  // ─── DELETE .../connections/:credentialId ────────────────────────────────────

  /** Disconnects a Gmail connection — revokes the token and deactivates the credential. */
  @Delete('connections/:credentialId')
  @ApiOperation({
    summary: 'Disconnect Gmail connection',
    description:
      'Revokes the Gmail OAuth token and deactivates the credential. ' +
      'Revocation is best-effort — the credential is deactivated regardless.',
  })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async disconnect(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
  ): Promise<{ disconnected: boolean; tenantName: string | null }> {
    const companyId = this.requireCompanyId(ctx);
    return this.oauthService.disconnect({ credentialId, companyId });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private requireCompanyId(ctx: AuthContext): string {
    if (!ctx?.companyId) {
      throw new ForbiddenException(
        'No company assigned to this account — cannot perform Gmail operations',
      );
    }
    return ctx.companyId;
  }
}
