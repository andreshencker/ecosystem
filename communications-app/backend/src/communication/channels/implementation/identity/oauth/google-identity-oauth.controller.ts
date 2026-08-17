// src/communication/channels/implementation/identity/oauth/google-identity-oauth.controller.ts
//
// "Sign in with Google" OAuth 2.0 connection lifecycle endpoints.
//
// Route summary:
//   POST /relay/channels/oauth/identity/google/start                       — start OAuth flow
//   GET  /relay/channels/oauth/identity/google/callback                    — public OAuth callback
//   GET  /relay/channels/oauth/identity/google/connections/:credentialId/status — verify connection
//   DELETE /relay/channels/oauth/identity/google/connections/:credentialId — disconnect
//
// Relay's job stops at "here is the verified provider profile" — what the
// calling application does with that identity (create a user, link an
// account, start a session) is business logic that stays out of Relay.

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

import { GoogleIdentityOAuthService } from './google-identity-oauth.service';
import { GoogleIdentityApiClient } from './google-identity-api.client';
import type { IdentityConnectionStatus } from './identity-oauth.types';

class StartIdentityOAuthDto {
  @IsMongoId()
  providerCredentialsId!: string;

  @IsOptional()
  @IsString()
  returnPath?: string;
}

@ApiTags('Identity — Google OAuth')
@Controller('relay/channels/oauth/identity/google')
export class GoogleIdentityOAuthController {
  private readonly logger = new Logger(GoogleIdentityOAuthController.name);

  constructor(
    private readonly oauthService: GoogleIdentityOAuthService,
    private readonly googleApi: GoogleIdentityApiClient,
  ) {}

  // ─── POST .../start ───────────────────────────────────────────────────────────

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start "Sign in with Google" authorization',
    description:
      'Returns the Google authorization URL. Requires an existing ' +
      'ProviderCredentials record with clientId/clientSecret (own or reused).',
  })
  async startOAuth(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: StartIdentityOAuthDto,
  ): Promise<{ authorizationUrl: string }> {
    const companyId = this.requireCompanyId(ctx);

    const credResult = await this.oauthService.readDecryptedCredential({
      credentialId: dto.providerCredentialsId,
      companyId,
    });

    if (!credResult) {
      throw new NotFoundException(
        'Credential not found or does not belong to this company. ' +
          'Create a Google (Identity) credential with your clientId and clientSecret first.',
      );
    }

    const { clientId } = await this.oauthService.resolveClientCredentials(
      credResult.decrypted,
      companyId,
    );

    const { authorizationUrl } = await this.oauthService.buildAuthorizationUrl({
      companyId,
      providerCredentialsId: dto.providerCredentialsId,
      clientId,
      returnPath: dto.returnPath,
    });

    this.logger.log(
      `[identity-oauth] Authorization started: companyId=${companyId} credentialId=${dto.providerCredentialsId}`,
    );

    return { authorizationUrl };
  }

  // ─── GET .../callback ─────────────────────────────────────────────────────────

  @Public()
  @Get('callback')
  @Redirect()
  @ApiOperation({
    summary: 'Google identity OAuth callback (public)',
    description:
      'Receives the Google authorization code, exchanges it for tokens, ' +
      'reads the verified profile, persists it, and redirects.',
  })
  async handleCallback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ): Promise<{ url: string; statusCode: number }> {
    const redirect = (url: string) => ({ url, statusCode: HttpStatus.FOUND });

    if (error || !code || !state) {
      const reason = error ?? 'Authorization code or state missing';
      this.logger.warn(`[identity-cb] Callback received with error: ${reason}`);
      return redirect(this.oauthService.buildErrorRedirectUrl(reason));
    }

    const stateData = await this.oauthService.consumeOAuthState(state);
    if (!stateData) {
      this.logger.warn(
        '[identity-cb] Invalid or expired state — possible CSRF or replay attempt',
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
        `[identity-cb] Could not read credential ${providerCredentialsId} for code exchange`,
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Credential not found — the connection setup may have been deleted',
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
        `[identity-cb] Could not resolve client credentials for ${providerCredentialsId}: ${err?.message}`,
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
      this.logger.warn(`[identity-cb] Code exchange failed: ${reason}`);
      return redirect(this.oauthService.buildErrorRedirectUrl(reason));
    }

    let profile;
    try {
      profile = await this.googleApi.getUserInfo(tokenResponse.access_token);
    } catch (err: any) {
      this.logger.warn(
        `[identity-cb] Failed to read Google userinfo after code exchange: ${err?.message}`,
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Connected to Google but could not read the verified profile — please try again',
        ),
      );
    }

    try {
      await this.oauthService.persistTokens({
        credentialId: providerCredentialsId,
        tokenResponse,
        emailAddress: profile.email,
        displayName: profile.name,
        providerUserId: profile.sub,
      });
    } catch (err: any) {
      this.logger.error(`[identity-cb] Failed to persist tokens: ${err?.message}`);
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Failed to save the connection — please try again',
        ),
      );
    }

    this.logger.log(
      `[identity-cb] Connection complete: credentialId=${providerCredentialsId} emailAddress=${profile.email}`,
    );

    return redirect(
      this.oauthService.buildSuccessRedirectUrl({
        credentialId: providerCredentialsId,
        returnPath,
      }),
    );
  }

  // ─── GET .../connections/:credentialId/status ────────────────────────────────

  @Get('connections/:credentialId/status')
  @ApiOperation({
    summary: 'Verify Google identity connection status',
    description:
      'Calls the Google userinfo endpoint to confirm the connection is live. ' +
      'Returns canonical status only — never tokens.',
  })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async getConnectionStatus(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
  ): Promise<IdentityConnectionStatus> {
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
        providerKey: 'google_identity',
        emailAddress: null,
        displayName: null,
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
      const profile = await this.googleApi.getUserInfo(accessToken);

      return {
        connected: true,
        providerKey: 'google_identity',
        emailAddress: profile.email,
        displayName: profile.name ?? null,
        grantedScopes: decrypted.scopes?.join(' ') ?? null,
        tokenExpiresAt: decrypted.expiresAt ?? null,
        checkedAt,
      };
    } catch (err: any) {
      return {
        connected: false,
        providerKey: 'google_identity',
        emailAddress: decrypted.emailAddress ?? null,
        displayName: decrypted.displayName ?? null,
        grantedScopes: decrypted.scopes?.join(' ') ?? null,
        tokenExpiresAt: decrypted.expiresAt ?? null,
        checkedAt,
        reason: String(err?.message ?? 'Connection check failed'),
      };
    }
  }

  // ─── DELETE .../connections/:credentialId ────────────────────────────────────

  @Delete('connections/:credentialId')
  @ApiOperation({
    summary: 'Disconnect Google identity connection',
    description:
      'Revokes the token and deactivates the credential. Revocation is ' +
      'best-effort — the credential is deactivated regardless.',
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
        'No company assigned to this account — cannot perform identity operations',
      );
    }
    return ctx.companyId;
  }
}
