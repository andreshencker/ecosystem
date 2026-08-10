// src/accounting/providers/xero/xero.oauth.service.ts
//
// Xero OAuth 2.0 core operations.
//
// Responsibilities:
//   - Build Xero authorization URLs (with PKCE).
//   - Store and consume single-use OAuth state in Redis.
//   - Exchange authorization codes for tokens.
//   - Refresh access tokens (with rotate-on-use handling).
//   - Persist updated tokens into ProviderCredentials.
//   - Revoke Xero connections via the connections API.
//
// All Xero endpoint URLs, scopes, and response types live in this file and
// xero.oauth.types.ts. Nothing Xero-specific leaks into generic services.
//
// Security rules enforced here:
//   - State is stored server-side (Redis), never in the browser.
//   - State is consumed on first use (single-use protection).
//   - PKCE S256 prevents code interception attacks.
//   - Tokens are never logged, never returned to callers.
//   - Encrypted storage via CryptoService for all persisted tokens.

import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';

import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants';
import type Redis from 'ioredis';

import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../../../communication/channels/provider-credentials/schemas/provider-credentials.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../../../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';
import { CryptoService } from '../../../communication/common/security/crypto.service';

import type { XeroOAuthCredentials } from './xero.credentials.contract';
import {
  XERO_AUTH_URL,
  XERO_TOKEN_URL,
  XERO_CONNECTIONS_URL,
  XERO_DEFAULT_SCOPES,
  XERO_ACCESS_TOKEN_TTL_SEC,
  XERO_TOKEN_REFRESH_BUFFER_SEC,
  type XeroTokenResponse,
  type XeroConnectionItem,
  type XeroOAuthStateData,
  type XeroPendingTenantSessionData,
} from './xero.oauth.types';

// ─── Redis key builders ───────────────────────────────────────────────────────

const STATE_KEY = (state: string) => `xero:oauth:state:${state}`;
const PENDING_KEY = (sessionId: string) => `xero:oauth:pending:${sessionId}`;
const REFRESH_LOCK_KEY = (credentialId: string) =>
  `xero:refresh:lock:${credentialId}`;

const STATE_TTL_SEC = 600; // 10 minutes — covers 5-min auth code TTL + latency
const PENDING_TTL_SEC = 300; // 5 minutes for tenant selection
const REFRESH_LOCK_TTL_SEC = 30;

// ─── Safe logging helpers ─────────────────────────────────────────────────────

/** Returns first 4 chars + '...' — safe for log lines. Never logs full tokens. */
function redactToken(token: string | undefined): string {
  if (!token || token.length < 5) return '[empty]';
  return `${token.substring(0, 4)}...[redacted]`;
}

@Injectable()
export class XeroOAuthService {
  private readonly logger = new Logger(XeroOAuthService.name);

  private readonly apiBaseUrl: string;
  private readonly frontendReturnUrl: string;
  private readonly defaultScopes: string;

  constructor(
    @InjectModel(ProviderCredentials.name)
    private readonly credModel: Model<ProviderCredentialsDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {
    this.apiBaseUrl = this.config.get<string>(
      'API_BASE_URL',
      'http://localhost:3001',
    );
    this.frontendReturnUrl = this.config.get<string>(
      'XERO_OAUTH_FRONTEND_RETURN_URL',
      'http://localhost:3000/provider-credentials',
    );
    this.defaultScopes = this.config.get<string>(
      'XERO_OAUTH_SCOPES',
      XERO_DEFAULT_SCOPES,
    );
  }

  // ─── Redirect URI ────────────────────────────────────────────────────────────

  /** The callback URL registered in the Xero developer portal. */
  get callbackUrl(): string {
    return `${this.apiBaseUrl}/accounting/oauth/xero/callback`;
  }

  // ─── Setup metadata ───────────────────────────────────────────────────────────

  /**
   * Returns safe setup metadata for the Xero OAuth connection.
   *
   * The callbackUrl is shown read-only in the UI so the company's developer
   * can register it in their Xero application.  It is generated from
   * API_BASE_URL — never stored per credential.
   */
  getSetupMetadata() {
    return {
      providerKey: 'xero' as const,
      channelKey: 'accounting' as const,
      connectionType: 'oauth' as const,
      callbackUrl: this.callbackUrl,
      requiresClientCredentials: true,
      supportsMultipleOrganisations: true,
      instructions: [
        'Open or create your Xero Developer application at developer.xero.com/app/manage.',
        `Register this Communications callback URL in your Xero application: ${this.callbackUrl}`,
        'Enter your Xero Client ID and Client Secret in the fields below.',
        'Save, then click "Connect with Xero" to authorise your organisation(s).',
        'If multiple organisations are authorised, select the one to use for Banking.',
      ],
    };
  }

  // ─── PKCE helpers ────────────────────────────────────────────────────────────

  private generateCodeVerifier(): string {
    // RFC 7636 §4.1: code_verifier is a high-entropy random string.
    // Base64URL-encoded 32 random bytes → 43 characters.
    return crypto.randomBytes(32).toString('base64url');
  }

  private deriveCodeChallenge(codeVerifier: string): string {
    // RFC 7636 §4.2: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  }

  // ─── OAuth state (Redis) ─────────────────────────────────────────────────────

  /** Generates a cryptographically random state token. */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /** Stores OAuth state in Redis. Returns the opaque state token. */
  async storeOAuthState(data: XeroOAuthStateData): Promise<string> {
    const state = this.generateState();
    await this.redis.set(
      STATE_KEY(state),
      JSON.stringify(data),
      'EX',
      STATE_TTL_SEC,
    );
    return state;
  }

  /**
   * Consumes the OAuth state from Redis.
   *
   * Deletes the key immediately (single-use protection).
   * Returns null if the state is not found or has expired.
   */
  async consumeOAuthState(state: string): Promise<XeroOAuthStateData | null> {
    const key = STATE_KEY(state);
    const raw = await this.redis.get(key);
    if (!raw) return null;

    await this.redis.del(key);

    try {
      return JSON.parse(raw) as XeroOAuthStateData;
    } catch {
      this.logger.warn(`[xero-oauth] Failed to parse state for key=${key}`);
      return null;
    }
  }

  // ─── Pending tenant session (Redis) ─────────────────────────────────────────

  /** Stores a pending tenant selection session. Returns the opaque session ID. */
  async storePendingTenantSession(
    data: XeroPendingTenantSessionData,
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    await this.redis.set(
      PENDING_KEY(sessionId),
      JSON.stringify(data),
      'EX',
      PENDING_TTL_SEC,
    );
    return sessionId;
  }

  /** Reads the pending tenant session without consuming it (allows reading tenants). */
  async getPendingTenantSession(
    sessionId: string,
  ): Promise<XeroPendingTenantSessionData | null> {
    const raw = await this.redis.get(PENDING_KEY(sessionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as XeroPendingTenantSessionData;
    } catch {
      return null;
    }
  }

  /** Reads and deletes the pending session (single-use on tenant selection). */
  async consumePendingTenantSession(
    sessionId: string,
  ): Promise<XeroPendingTenantSessionData | null> {
    const key = PENDING_KEY(sessionId);
    const raw = await this.redis.get(key);
    if (!raw) return null;
    await this.redis.del(key);
    try {
      return JSON.parse(raw) as XeroPendingTenantSessionData;
    } catch {
      return null;
    }
  }

  // ─── Authorization URL ───────────────────────────────────────────────────────

  /**
   * Builds a Xero authorization URL and stores the state + PKCE verifier
   * server-side in Redis.
   *
   * Returns the URL to redirect the browser to, along with the state token.
   */
  async buildAuthorizationUrl(params: {
    companyId: string;
    providerCredentialsId: string;
    clientId: string;
    returnPath?: string;
  }): Promise<{ authorizationUrl: string; state: string }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.deriveCodeChallenge(codeVerifier);

    const stateData: XeroOAuthStateData = {
      companyId: params.companyId,
      providerCredentialsId: params.providerCredentialsId,
      codeVerifier,
      returnPath: this.sanitizeReturnPath(params.returnPath),
      createdAt: Math.floor(Date.now() / 1000),
    };

    const state = await this.storeOAuthState(stateData);

    const url = new URL(XERO_AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', this.callbackUrl);
    url.searchParams.set('scope', this.defaultScopes);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return { authorizationUrl: url.toString(), state };
  }

  /** Validates and sanitizes a return path. Allows only relative paths. */
  private sanitizeReturnPath(returnPath?: string): string | undefined {
    if (!returnPath) return undefined;
    // Only allow relative paths (no protocol, no //hostname)
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(returnPath)) return undefined;
    if (returnPath.startsWith('//')) return undefined;
    // Allow only path-like strings
    return returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  }

  // ─── Token exchange ──────────────────────────────────────────────────────────

  /**
   * Exchanges an authorization code for Xero tokens.
   *
   * Authentication uses HTTP Basic Auth with `client_id:client_secret` as the
   * Authorization header, as required by the Xero token endpoint.
   * The `code_verifier` is included to complete PKCE validation.
   *
   * Never logs the code, tokens, or Authorization header.
   */
  async exchangeAuthorizationCode(params: {
    code: string;
    codeVerifier: string;
    clientId: string;
    clientSecret: string;
  }): Promise<XeroTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: this.callbackUrl,
      code_verifier: params.codeVerifier,
    });

    const basicAuth = Buffer.from(
      `${params.clientId}:${params.clientSecret}`,
    ).toString('base64');

    const res = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const errMsg = String(
        errBody['error_description'] ?? errBody['error'] ?? res.status,
      );
      this.logger.warn(`[xero-oauth] Code exchange failed: ${errMsg}`);
      throw new HttpException(
        `Xero authorization failed: ${errMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await res.json()) as XeroTokenResponse;
    this.logger.log(
      `[xero-oauth] Code exchange succeeded; token=${redactToken(data.access_token)}`,
    );
    return data;
  }

  // ─── Token refresh ───────────────────────────────────────────────────────────

  /**
   * Refreshes a Xero access token using the stored refresh token.
   *
   * Xero rotates refresh tokens on each use. The old refresh token remains
   * valid for a 30-minute grace period, but the new token must be persisted
   * immediately after a successful refresh.
   *
   * A Redis lock prevents concurrent refresh races on the same credential.
   */
  async refreshAndPersist(params: {
    credentialId: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    decryptedCreds: XeroOAuthCredentials;
  }): Promise<string> {
    const lockKey = REFRESH_LOCK_KEY(params.credentialId);

    // Acquire a short-lived lock. EX sets the TTL; NX = only set if not exists.
    // ioredis signature: set(key, value, 'EX', seconds, 'NX')
    const acquired = await this.redis.set(
      lockKey,
      '1',
      'EX',
      REFRESH_LOCK_TTL_SEC,
      'NX',
    );

    if (!acquired) {
      // Another instance is refreshing. Wait briefly, then re-read to see
      // if it completed. Xero's 30-min grace period makes this safe.
      await new Promise<void>((r) => setTimeout(r, 1500));
      const fresh = await this.readAndDecryptCredential(params.credentialId);
      if (fresh) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (
          fresh.accessToken &&
          fresh.expiresAt &&
          fresh.expiresAt - nowSec > XERO_TOKEN_REFRESH_BUFFER_SEC
        ) {
          return fresh.accessToken;
        }
      }
      throw new HttpException(
        'Token refresh collision — please retry in a moment',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const newTokens = await this.doRefreshRequest({
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        refreshToken: params.refreshToken,
      });

      const nowSec = Math.floor(Date.now() / 1000);
      const newExpiresAt =
        nowSec + (newTokens.expires_in ?? XERO_ACCESS_TOKEN_TTL_SEC);

      const updatedCreds: XeroOAuthCredentials = {
        ...params.decryptedCreds,
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: newExpiresAt,
        scopes: newTokens.scope,
      };

      const encrypted = this.crypto.encryptJson(updatedCreds);
      await this.credModel.updateOne(
        { _id: new Types.ObjectId(params.credentialId) },
        { $set: { encrypted } },
      );

      this.logger.log(
        `[xero-oauth] Token refreshed for credentialId=${params.credentialId}; ` +
          `new token=${redactToken(newTokens.access_token)} expiresAt=${newExpiresAt}`,
      );

      // Propagate the new tokens to any sibling credential records that hold
      // the same Xero OAuth connection for a different channel (e.g. Billing).
      // Xero rotates refresh tokens on each use, so all channel-specific copies
      // must be updated atomically or subsequent Billing token refreshes will
      // fail with invalid_grant.
      await this.syncTokensAcrossChannels(params.credentialId, updatedCreds);

      return newTokens.access_token;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /**
   * Propagates refreshed OAuth tokens to sibling ProviderCredentials records
   * that belong to the same Xero provider + company across different channels.
   *
   * Context: when a company uses Xero for both Accounting and Billing, there
   * are two separate ProviderCredentials records (one per channel CCP). Xero
   * rotates refresh tokens on each use, so the sibling record must be updated
   * with the new tokens immediately — otherwise the next Billing token refresh
   * will fail because its stored refresh token has been invalidated.
   *
   * Only the OAuth token fields are merged. The sibling's own clientId,
   * clientSecret, and tenantId are preserved unchanged.
   *
   * This method is fire-and-tolerant: a failure here is logged but does NOT
   * roll back the successful primary refresh. The 30-minute Xero grace period
   * provides a recovery window.
   */
  private async syncTokensAcrossChannels(
    updatedCredentialId: string,
    updatedCreds: XeroOAuthCredentials,
  ): Promise<void> {
    try {
      // Locate the CCP for the credential we just refreshed.
      const primaryCred = await this.credModel
        .findById(new Types.ObjectId(updatedCredentialId))
        .select('companyChannelProviderId')
        .lean()
        .exec();
      if (!primaryCred) return;

      const primaryCcp = await this.ccpModel
        .findById((primaryCred as any).companyChannelProviderId)
        .select('companyId providerId')
        .lean()
        .exec();
      if (!primaryCcp) return;

      // Find all OTHER CCPs for the same company + provider (different channels).
      const siblingCcps = await this.ccpModel
        .find({
          companyId: (primaryCcp as any).companyId,
          providerId: (primaryCcp as any).providerId,
          _id: { $ne: (primaryCcp as any)._id },
          isActive: true,
        })
        .select('_id')
        .lean()
        .exec();

      if (siblingCcps.length === 0) return;

      // Find all active credential records for those sibling CCPs.
      const siblingCreds = await this.credModel
        .find({
          companyChannelProviderId: { $in: siblingCcps.map((c: any) => c._id) },
          isActive: true,
        })
        .select('_id encrypted')
        .lean()
        .exec();

      if (siblingCreds.length === 0) return;

      // Update each sibling credential — merge only the token fields, preserve
      // the sibling's own clientId, clientSecret, and tenantId.
      for (const sibCred of siblingCreds) {
        let sibDecrypted: Record<string, unknown>;
        try {
          sibDecrypted = this.crypto.decryptJson((sibCred as any).encrypted);
        } catch {
          this.logger.warn(
            `[xero-oauth] syncTokens: could not decrypt sibling credentialId=${String((sibCred as any)._id)} — skipping`,
          );
          continue;
        }

        const merged: Record<string, unknown> = {
          ...sibDecrypted,
          accessToken: updatedCreds.accessToken,
          refreshToken: updatedCreds.refreshToken,
          expiresAt: updatedCreds.expiresAt,
          scopes: updatedCreds.scopes,
        };

        const reencrypted = this.crypto.encryptJson(merged);
        await this.credModel.updateOne(
          { _id: (sibCred as any)._id },
          { $set: { encrypted: reencrypted } },
        );
      }

      this.logger.log(
        `[xero-oauth] Token sync: updated ${siblingCreds.length} sibling credential(s) ` +
          `for credentialId=${updatedCredentialId}`,
      );
    } catch (err: unknown) {
      // Non-fatal: the primary credential is already updated.
      // Log the failure so it's visible in monitoring without blocking the caller.
      this.logger.warn(
        `[xero-oauth] syncTokensAcrossChannels failed for credentialId=${updatedCredentialId}: ` +
          `${String((err as any)?.message ?? err)} — sibling credentials may be stale`,
      );
    }
  }

  /** Raw POST to Xero token endpoint for refresh. Never logs tokens. */
  private async doRefreshRequest(params: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }): Promise<XeroTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    });

    const basicAuth = Buffer.from(
      `${params.clientId}:${params.clientSecret}`,
    ).toString('base64');

    const res = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const errCode = String(errBody['error'] ?? '');
      const errDesc = String(errBody['error_description'] ?? res.status);

      if (errCode === 'invalid_grant') {
        throw new HttpException(
          'Xero refresh token is invalid or expired — re-authorization required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      this.logger.warn(`[xero-oauth] Token refresh failed: ${errDesc}`);
      throw new HttpException(
        `Xero token refresh failed: ${errDesc}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return res.json() as Promise<XeroTokenResponse>;
  }

  // ─── Connection persistence ──────────────────────────────────────────────────

  /**
   * Persists Xero OAuth tokens into an existing ProviderCredentials record.
   *
   * Decrypts the existing credential, merges the new token fields, re-encrypts,
   * and atomically updates the record. The `displayIdentifier` is updated to
   * the tenant name for safe display in the UI.
   *
   * This method bypasses the normal ProviderCredentialsService.update() path
   * to avoid re-running the credential validation contract (which requires
   * clientId + clientSecret to be present in the incoming DTO).
   */
  async persistTokens(params: {
    credentialId: string;
    tokenResponse: XeroTokenResponse;
    tenantId: string;
    tenantName: string | null;
    connectionId: string;
  }): Promise<void> {
    const existing = await this.credModel
      .findById(new Types.ObjectId(params.credentialId))
      .lean()
      .exec();

    if (!existing) {
      throw new HttpException(
        'Credential not found — cannot persist Xero tokens',
        HttpStatus.NOT_FOUND,
      );
    }

    let currentDecrypted: XeroOAuthCredentials;
    try {
      currentDecrypted = this.crypto.decryptJson(
        (existing as any).encrypted,
      ) as XeroOAuthCredentials;
    } catch {
      throw new HttpException(
        'Could not decrypt existing credential',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt =
      nowSec + (params.tokenResponse.expires_in ?? XERO_ACCESS_TOKEN_TTL_SEC);

    const updated: XeroOAuthCredentials = {
      ...currentDecrypted,
      accessToken: params.tokenResponse.access_token,
      refreshToken: params.tokenResponse.refresh_token,
      expiresAt,
      scopes: params.tokenResponse.scope,
      tenantId: params.tenantId,
    };

    const encrypted = this.crypto.encryptJson(updated);

    // Display identifier: tenant name is safe; clientId is the fallback.
    const displayIdentifier =
      params.tenantName ?? currentDecrypted.clientId ?? undefined;

    await this.credModel.updateOne(
      { _id: new Types.ObjectId(params.credentialId) },
      {
        $set: {
          encrypted,
          displayIdentifier,
          // mode is null for Xero — no test/live distinction at credential level.
          mode: null,
        },
      },
    );

    this.logger.log(
      `[xero-oauth] Tokens persisted for credentialId=${params.credentialId} ` +
        `tenantId=${params.tenantId} tenantName="${params.tenantName ?? 'unknown'}"`,
    );
  }

  // ─── Connection listing ──────────────────────────────────────────────────────

  /**
   * Lists all Xero tenant connections authorised for the given access token.
   *
   * GET https://api.xero.com/connections
   * Authorization: Bearer {access_token}
   */
  async listConnections(accessToken: string): Promise<XeroConnectionItem[]> {
    const res = await fetch(XERO_CONNECTIONS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      this.logger.warn(
        `[xero-oauth] GET /connections failed: ${res.status} ${JSON.stringify(errBody)}`,
      );
      throw new HttpException(
        'Failed to list Xero connections — check that the access token is valid',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return res.json() as Promise<XeroConnectionItem[]>;
  }

  /**
   * Revokes a specific Xero tenant connection.
   *
   * DELETE https://api.xero.com/connections/{connectionId}
   *
   * After revocation, the organisation's connection to this app is removed.
   * The user would need to re-authorize to reconnect.
   */
  async revokeConnection(params: {
    accessToken: string;
    connectionId: string;
  }): Promise<void> {
    const url = `${XERO_CONNECTIONS_URL}/${encodeURIComponent(params.connectionId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });

    if (!res.ok && res.status !== 204) {
      const errBody = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      this.logger.warn(
        `[xero-oauth] DELETE /connections/${params.connectionId} failed: ${res.status}`,
      );
      throw new HttpException(
        `Failed to revoke Xero connection: ${String(errBody['Detail'] ?? res.status)}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.logger.log(
      `[xero-oauth] Connection revoked: connectionId=${params.connectionId}`,
    );
  }

  // ─── Credential reading ──────────────────────────────────────────────────────

  /**
   * Reads and decrypts a ProviderCredentials record.
   *
   * Validates that the credential belongs to the given company via its
   * CompanyChannelProvider relationship. Returns null if not found.
   */
  async readDecryptedCredential(params: {
    credentialId: string;
    companyId: string;
  }): Promise<{ credential: any; decrypted: XeroOAuthCredentials } | null> {
    const cred = await this.credModel
      .findOne({
        _id: new Types.ObjectId(params.credentialId),
        isActive: true,
      })
      .populate({
        path: 'companyChannelProviderId',
        select: 'companyId isActive',
      })
      .lean()
      .exec();

    if (!cred) return null;

    const ccp = (cred as any).companyChannelProviderId;
    if (!ccp || String(ccp.companyId) !== params.companyId) return null;

    let decrypted: XeroOAuthCredentials;
    try {
      decrypted = this.crypto.decryptJson(
        (cred as any).encrypted,
      ) as XeroOAuthCredentials;
    } catch {
      this.logger.error(
        `[xero-oauth] Failed to decrypt credentialId=${params.credentialId}`,
      );
      return null;
    }

    return { credential: cred, decrypted };
  }

  /**
   * Reads and decrypts a credential by ID only (no company validation).
   * Used internally during token refresh initiated by the callback.
   */
  async readAndDecryptCredential(
    credentialId: string,
  ): Promise<XeroOAuthCredentials | null> {
    const cred = await this.credModel
      .findById(new Types.ObjectId(credentialId))
      .lean()
      .exec();
    if (!cred) return null;
    try {
      return this.crypto.decryptJson(
        (cred as any).encrypted,
      ) as XeroOAuthCredentials;
    } catch {
      return null;
    }
  }

  // ─── Frontend redirect URL builder ──────────────────────────────────────────

  /** Builds the frontend redirect URL after a successful OAuth connection. */
  buildSuccessRedirectUrl(params: {
    credentialId: string;
    returnPath?: string;
  }): string {
    const base = params.returnPath
      ? `${this.frontendReturnUrl.replace(/\/$/, '')}${params.returnPath}`
      : this.frontendReturnUrl;

    const url = new URL(base);
    url.searchParams.set('status', 'connected');
    url.searchParams.set('credentialId', params.credentialId);
    return url.toString();
  }

  /** Builds the frontend redirect URL when tenant selection is required. */
  buildTenantSelectionRedirectUrl(sessionId: string): string {
    const url = new URL(this.frontendReturnUrl);
    url.searchParams.set('status', 'select_tenant');
    url.searchParams.set('sessionId', sessionId);
    // Include the base path so the generic frontend knows which provider API to call.
    // This is not a secret — it is a route prefix (e.g. /accounting/oauth/xero).
    url.searchParams.set('oauthBasePath', '/accounting/oauth/xero');
    return url.toString();
  }

  /** Builds the frontend redirect URL when the OAuth flow fails. */
  buildErrorRedirectUrl(reason: string): string {
    const url = new URL(this.frontendReturnUrl);
    url.searchParams.set('status', 'error');
    // Reason is safe to expose — contains no secret values.
    url.searchParams.set('reason', reason.substring(0, 200));
    return url.toString();
  }
}
