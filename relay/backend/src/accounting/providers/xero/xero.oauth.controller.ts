// src/accounting/providers/xero/xero.oauth.controller.ts
//
// Xero OAuth 2.0 connection lifecycle endpoints.
//
// Route summary:
//   GET    /accounting/oauth/xero/setup                              — setup metadata (callbackUrl)
//   POST   /accounting/oauth/xero/start                             — start OAuth flow
//   GET    /accounting/oauth/xero/callback                          — public OAuth callback
//   GET    /accounting/oauth/xero/tenants/:sessionId                — list tenant choices
//   POST   /accounting/oauth/xero/tenants/:sessionId/select         — complete tenant selection
//   GET    /accounting/oauth/xero/connections/:credentialId/status   — verify connection
//   GET    /accounting/oauth/xero/connections/:credentialId/organisations        — list orgs
//   POST   /accounting/oauth/xero/connections/:credentialId/organisations/refresh — refresh orgs
//   DELETE /accounting/oauth/xero/connections/:credentialId          — disconnect
//
// Security model:
//   - All routes except /callback and /setup require a valid JWT.
//   - The /callback route is @Public() because Xero calls it without our JWT.
//     CSRF protection is provided by the server-side state validated on entry.
//   - Company isolation is enforced on every authenticated route via companyId
//     from the JWT AuthContext — never from request body or query params.
//   - State and pending sessions are stored server-side in Redis.
//   - Organisation management endpoints validate credential + company ownership.

import {
  BadRequestException,
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
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

import { Public } from '../../../infrastructure/security/decorators/public.decorator';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

import { XeroOAuthService } from './xero.oauth.service';
import { XeroConnectionService } from './xero.connection.service';
import { XeroOrganisationsService } from './xero-organisations.service';
import type { XeroTenantOption } from './xero.oauth.types';
import type {
  XeroOrganisationsListResponse,
  XeroOrganisationsRefreshResponse,
  XeroSetupMetadata,
} from './xero-organisations.types';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class StartXeroOAuthDto {
  @IsMongoId()
  providerCredentialsId!: string;

  @IsOptional()
  @IsString()
  returnPath?: string;
}

class SelectXeroTenantDto {
  @IsString()
  tenantId!: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Accounting — Xero OAuth')
@Controller('accounting/oauth/xero')
export class XeroOAuthController {
  private readonly logger = new Logger(XeroOAuthController.name);

  constructor(
    private readonly oauthService: XeroOAuthService,
    private readonly connectionService: XeroConnectionService,
    private readonly orgService: XeroOrganisationsService,
  ) {}

  // ─── GET /accounting/oauth/xero/setup ────────────────────────────────────────

  /**
   * Returns safe setup metadata for the Xero OAuth connection.
   *
   * The callbackUrl is generated from API_BASE_URL and must be registered in
   * the company's Xero Developer application.  This endpoint is public so
   * the UI can display it before the user has saved credentials.
   */
  @Public()
  @Get('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Xero OAuth setup metadata',
    description:
      'Returns the Communications callback URL and setup instructions. ' +
      "The callbackUrl must be registered in the company's Xero Developer " +
      'application.  It is generated from API_BASE_URL — never stored per connection.',
  })
  getSetupMetadata(): XeroSetupMetadata {
    return this.oauthService.getSetupMetadata();
  }

  // ─── POST /accounting/oauth/xero/start ───────────────────────────────────────

  /**
   * Initiates the Xero OAuth 2.0 authorization flow.
   *
   * Reads the company-owned clientId from the ProviderCredentials record,
   * generates the Xero authorization URL with PKCE and a server-side state,
   * and returns the URL for the frontend to redirect to.
   *
   * Response: { authorizationUrl: string }
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start Xero OAuth authorization',
    description:
      'Returns the Xero authorization URL. The client should redirect the ' +
      'user to this URL. Requires an existing ProviderCredentials record with ' +
      "the company's Xero clientId and clientSecret.",
  })
  async startOAuth(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: StartXeroOAuthDto,
  ): Promise<{ authorizationUrl: string }> {
    const companyId = this.requireCompanyId(ctx);

    const credResult = await this.oauthService.readDecryptedCredential({
      credentialId: dto.providerCredentialsId,
      companyId,
    });

    if (!credResult) {
      throw new NotFoundException(
        'Credential not found or does not belong to this company. ' +
          'Create a Xero credential with your clientId and clientSecret first.',
      );
    }

    const { decrypted } = credResult;

    if (!decrypted.clientId || !decrypted.clientSecret) {
      throw new BadRequestException(
        'The credential is missing clientId or clientSecret. ' +
          'Enter your Xero application credentials and save before connecting.',
      );
    }

    const { authorizationUrl } = await this.oauthService.buildAuthorizationUrl({
      companyId,
      providerCredentialsId: dto.providerCredentialsId,
      clientId: decrypted.clientId,
      returnPath: dto.returnPath,
    });

    this.logger.log(
      `[xero-oauth] Authorization started: companyId=${companyId} ` +
        `credentialId=${dto.providerCredentialsId}`,
    );

    return { authorizationUrl };
  }

  // ─── GET /accounting/oauth/xero/callback ─────────────────────────────────────

  /**
   * Public OAuth callback — Xero redirects here after user authorization.
   *
   * Validates state (CSRF), exchanges code (PKCE), discovers tenants.
   *
   * Single organisation: auto-selects, persists tokens and org metadata,
   *   redirects to frontend success.
   * Multiple organisations: stores pending session, redirects to selection page.
   */
  @Public()
  @Get('callback')
  @Redirect()
  @ApiOperation({
    summary: 'Xero OAuth callback (public)',
    description:
      'Receives the Xero authorization code. Validates state (CSRF), ' +
      'exchanges code for tokens (PKCE), discovers tenants, and redirects.',
  })
  async handleCallback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ): Promise<{ url: string; statusCode: number }> {
    const redirect = (url: string) => ({ url, statusCode: HttpStatus.FOUND });

    if (error || !code || !state) {
      const reason = error ?? 'Authorization code or state missing';
      this.logger.warn(`[xero-cb] Callback received with error: ${reason}`);
      return redirect(this.oauthService.buildErrorRedirectUrl(reason));
    }

    const stateData = await this.oauthService.consumeOAuthState(state);
    if (!stateData) {
      this.logger.warn(
        '[xero-cb] Invalid or expired state — possible CSRF or replay attempt',
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Invalid or expired authorization state — please try again',
        ),
      );
    }

    const { companyId, providerCredentialsId, codeVerifier, returnPath } =
      stateData;

    const credResult = await this.oauthService.readAndDecryptCredential(
      providerCredentialsId,
    );

    if (!credResult || !credResult.clientId || !credResult.clientSecret) {
      this.logger.warn(
        `[xero-cb] Could not read credential ${providerCredentialsId} for code exchange`,
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Credential not found — the Xero connection setup may have been deleted',
        ),
      );
    }

    let tokenResponse;
    try {
      tokenResponse = await this.oauthService.exchangeAuthorizationCode({
        code,
        codeVerifier,
        clientId: credResult.clientId,
        clientSecret: credResult.clientSecret,
      });
    } catch (err: any) {
      const reason = String(err?.message ?? 'Token exchange failed');
      this.logger.warn(`[xero-cb] Code exchange failed: ${reason}`);
      return redirect(this.oauthService.buildErrorRedirectUrl(reason));
    }

    let connections;
    try {
      connections = await this.oauthService.listConnections(
        tokenResponse.access_token,
      );
    } catch (err: any) {
      this.logger.warn(
        `[xero-cb] Failed to list connections after code exchange: ${err?.message}`,
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'Failed to discover Xero organisations — please try again',
        ),
      );
    }

    if (!connections || connections.length === 0) {
      this.logger.warn(
        `[xero-cb] No Xero connections returned for companyId=${companyId}`,
      );
      return redirect(
        this.oauthService.buildErrorRedirectUrl(
          'No Xero organisation was authorised — please complete the Xero consent screen',
        ),
      );
    }

    // Single organisation: auto-select and complete the flow.
    if (connections.length === 1) {
      const conn = connections[0];
      try {
        await this.oauthService.persistTokens({
          credentialId: providerCredentialsId,
          tokenResponse,
          tenantId: conn.tenantId,
          tenantName: conn.tenantName,
          connectionId: conn.id,
        });

        // Save org metadata so it can be listed and selected later.
        await this.orgService.saveDiscoveredOrganisations({
          credentialId: providerCredentialsId,
          companyId,
          connections: connections.map((c) => ({
            connectionId: c.id,
            tenantId: c.tenantId,
            tenantType: c.tenantType,
            tenantName: c.tenantName,
          })),
          defaultTenantId: conn.tenantId,
        });

        this.logger.log(
          `[xero-cb] Single-org flow complete: companyId=${companyId} ` +
            `tenantName="${conn.tenantName ?? 'unknown'}"`,
        );

        return redirect(
          this.oauthService.buildSuccessRedirectUrl({
            credentialId: providerCredentialsId,
            returnPath,
          }),
        );
      } catch (err: any) {
        this.logger.error(
          `[xero-cb] Failed to persist tokens/orgs: ${err?.message}`,
        );
        return redirect(
          this.oauthService.buildErrorRedirectUrl(
            'Failed to save Xero connection — please try again',
          ),
        );
      }
    }

    // Multiple organisations: store pending session and redirect to selection page.
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = nowSec + (tokenResponse.expires_in ?? 1800);

    const sessionId = await this.oauthService.storePendingTenantSession({
      companyId,
      providerCredentialsId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
      scopes: tokenResponse.scope,
      connections: connections.map((c) => ({
        connectionId: c.id,
        tenantId: c.tenantId,
        tenantType: c.tenantType,
        tenantName: c.tenantName,
      })),
      createdAt: nowSec,
    });

    this.logger.log(
      `[xero-cb] Multi-org: ${connections.length} organisations found for companyId=${companyId}; ` +
        `pending sessionId=${sessionId}`,
    );

    return redirect(
      this.oauthService.buildTenantSelectionRedirectUrl(sessionId),
    );
  }

  // ─── GET /accounting/oauth/xero/tenants/:sessionId ───────────────────────────

  /**
   * Returns the list of organisation choices for a pending multi-org OAuth session.
   * Does not consume the session — call POST /select to complete.
   */
  @Get('tenants/:sessionId')
  @ApiOperation({
    summary: 'List pending Xero organisation choices',
    description:
      'Returns the authorised Xero organisations for multi-org OAuth selection. ' +
      'Does not consume the session — call POST /select to complete.',
  })
  @ApiParam({
    name: 'sessionId',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  async listPendingTenants(
    @CurrentUser() ctx: AuthContext,
    @Param('sessionId') sessionId: string,
  ): Promise<{ tenants: XeroTenantOption[] }> {
    const companyId = this.requireCompanyId(ctx);
    const session = await this.oauthService.getPendingTenantSession(sessionId);

    if (!session) {
      throw new NotFoundException(
        'Organisation selection session not found or expired — please restart the Xero authorization',
      );
    }

    if (session.companyId !== companyId) {
      throw new ForbiddenException(
        'This authorization session does not belong to your company',
      );
    }

    return {
      tenants: session.connections.map((c) => ({
        connectionId: c.connectionId,
        tenantId: c.tenantId,
        tenantType: c.tenantType,
        tenantName: c.tenantName,
      })),
    };
  }

  // ─── POST /accounting/oauth/xero/tenants/:sessionId/select ───────────────────

  /**
   * Completes the multi-org OAuth flow by selecting a specific Xero organisation.
   *
   * Consumes the pending session (single-use), persists tokens and saves ALL
   * discovered org metadata (not only the selected one), marks the selected org
   * as default.
   */
  @Post('tenants/:sessionId/select')
  @ApiOperation({
    summary: 'Select a Xero organisation to complete multi-org OAuth',
    description:
      'Consumes the pending session and persists the chosen organisation. ' +
      'All discovered organisations are saved for future selection. ' +
      'The session is single-use — only one call succeeds.',
  })
  @ApiParam({
    name: 'sessionId',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  async selectTenant(
    @CurrentUser() ctx: AuthContext,
    @Param('sessionId') sessionId: string,
    @Body() dto: SelectXeroTenantDto,
  ): Promise<{ credentialId: string; tenantName: string | null }> {
    const companyId = this.requireCompanyId(ctx);
    const session =
      await this.oauthService.consumePendingTenantSession(sessionId);

    if (!session) {
      throw new NotFoundException(
        'Organisation selection session not found, expired, or already used — please restart the authorization',
      );
    }

    if (session.companyId !== companyId) {
      throw new ForbiddenException(
        'This authorization session does not belong to your company',
      );
    }

    const chosen = session.connections.find((c) => c.tenantId === dto.tenantId);

    if (!chosen) {
      throw new BadRequestException(
        `The selected organisation is not in the authorised list for this session`,
      );
    }

    const tokenResponse = {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_in: session.expiresAt - Math.floor(Date.now() / 1000),
      token_type: 'Bearer' as const,
      scope: session.scopes,
    };

    await this.oauthService.persistTokens({
      credentialId: session.providerCredentialsId,
      tokenResponse,
      tenantId: chosen.tenantId,
      tenantName: chosen.tenantName,
      connectionId: chosen.connectionId,
    });

    // Save ALL discovered orgs (not just the selected one) so the user can
    // switch organisations without re-authorising.
    await this.orgService.saveDiscoveredOrganisations({
      credentialId: session.providerCredentialsId,
      companyId,
      connections: session.connections.map((c) => ({
        connectionId: c.connectionId,
        tenantId: c.tenantId,
        tenantType: c.tenantType,
        tenantName: c.tenantName,
      })),
      defaultTenantId: chosen.tenantId,
    });

    this.logger.log(
      `[xero-oauth] Multi-org selection complete: companyId=${companyId} ` +
        `tenantName="${chosen.tenantName ?? 'unknown'}" ` +
        `total orgs saved=${session.connections.length}`,
    );

    return {
      credentialId: session.providerCredentialsId,
      tenantName: chosen.tenantName,
    };
  }

  // ─── GET /accounting/oauth/xero/connections/:credentialId/status ─────────────

  /**
   * Tests a Xero connection by reading the organisation (non-destructive).
   * Returns safe canonical information only. Never returns tokens.
   */
  @Get('connections/:credentialId/status')
  @ApiOperation({
    summary: 'Verify Xero connection status',
    description:
      'Tests the Xero connection by calling GET /Organisations. ' +
      'Returns canonical status — no tokens or raw Xero objects.',
  })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async getConnectionStatus(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
  ) {
    const companyId = this.requireCompanyId(ctx);
    return this.connectionService.verifyConnection({ credentialId, companyId });
  }

  // ─── GET /accounting/oauth/xero/connections/:credentialId/organisations ───────

  /**
   * Lists the Xero organisations authorised through this OAuth connection.
   *
   * Returns safe metadata only — no tenantIds, tokens, or credentials.
   * The `id` field is the Communications organisation ID used to select an
   * org for Banking and other Accounting operations.
   */
  @Get('connections/:credentialId/organisations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List Xero organisations for an OAuth connection',
    description:
      'Returns all organisations (tenants) authorised through this Xero ' +
      'OAuth connection. No Xero tenant IDs or tokens are returned. ' +
      'Use the id field to select an organisation for Accounting operations.',
  })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async listOrganisations(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
  ): Promise<XeroOrganisationsListResponse> {
    const companyId = this.requireCompanyId(ctx);

    // Validate credential ownership without decrypting secrets.
    const credResult = await this.oauthService.readDecryptedCredential({
      credentialId,
      companyId,
    });

    if (!credResult) {
      throw new NotFoundException(
        'Credential not found or does not belong to this company',
      );
    }

    return this.orgService.listOrganisations({ credentialId, companyId });
  }

  // ─── POST /accounting/oauth/xero/connections/:credentialId/organisations/refresh

  /**
   * Refreshes the list of authorised organisations from Xero.
   *
   * Calls GET /connections with the stored access token (refreshing if needed),
   * then reconciles the stored organisation metadata:
   *   - Organisations no longer authorised are marked unavailable.
   *   - Newly authorised organisations are added.
   * No tokens or tenant IDs are returned.
   */
  @Post('connections/:credentialId/organisations/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh authorised Xero organisations',
    description:
      'Calls Xero to get the current list of authorised organisations and ' +
      'reconciles the stored metadata. Organisations removed from Xero are ' +
      'marked unavailable. Newly authorised organisations are added.',
  })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async refreshOrganisations(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
  ): Promise<XeroOrganisationsRefreshResponse> {
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

    const { decrypted } = credResult;

    let accessToken: string;
    try {
      accessToken = await this.connectionService.ensureFreshAccessToken({
        credentialId,
        decrypted,
      });
    } catch (err: any) {
      throw new ServiceUnavailableException(
        `Could not refresh Xero access token: ${err?.message ?? 'unknown error'}`,
      );
    }

    let freshConnections;
    try {
      freshConnections = await this.oauthService.listConnections(accessToken);
    } catch (err: any) {
      throw new ServiceUnavailableException(
        `Could not retrieve organisations from Xero: ${err?.message ?? 'unknown error'}`,
      );
    }

    return this.orgService.reconcileOrganisations({
      credentialId,
      companyId,
      freshConnections,
    });
  }

  // ─── DELETE /accounting/oauth/xero/connections/:credentialId ─────────────────

  /**
   * Disconnects a Xero connection.
   *
   * Revokes the connection at Xero and deactivates the credential.
   * Also marks all associated organisations as unavailable.
   */
  @Delete('connections/:credentialId')
  @ApiOperation({
    summary: 'Disconnect Xero connection',
    description:
      'Revokes the Xero connection and deactivates the credential. ' +
      'All associated organisations are marked unavailable. ' +
      'Revocation is best-effort — the credential is deactivated regardless.',
  })
  @ApiParam({ name: 'credentialId', example: '6776e4f1a0c1234567890abc' })
  async disconnect(
    @CurrentUser() ctx: AuthContext,
    @Param('credentialId') credentialId: string,
  ): Promise<{ disconnected: boolean; tenantName: string | null }> {
    const companyId = this.requireCompanyId(ctx);

    const result = await this.connectionService.disconnect({
      credentialId,
      companyId,
    });

    // Mark all orgs unavailable regardless of Xero revocation result.
    await this.orgService.markAllUnavailable(credentialId).catch((err: any) => {
      this.logger.warn(
        `[xero-oauth] Could not mark orgs unavailable for credentialId=${credentialId}: ${err?.message}`,
      );
    });

    return result;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private requireCompanyId(ctx: AuthContext): string {
    if (!ctx?.companyId) {
      throw new ForbiddenException(
        'No company assigned to this account — cannot perform Xero operations',
      );
    }
    return ctx.companyId;
  }
}
