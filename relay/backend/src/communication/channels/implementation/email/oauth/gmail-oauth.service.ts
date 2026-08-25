// src/communication/channels/implementation/email/oauth/gmail-oauth.service.ts
//
// Gmail OAuth 2.0 core operations.
//
// Responsibilities:
//   - Build Google authorization URLs (with PKCE).
//   - Store and consume single-use OAuth state in Redis.
//   - Exchange authorization codes for tokens.
//   - Refresh access tokens.
//   - Persist tokens + mailbox address into ProviderCredentials.
//
// Same client-credential model as XeroOAuthService: each company brings its
// own Google Cloud OAuth app (clientId/clientSecret), entered in the
// credential form and stored encrypted per ProviderCredentials record — not
// a shared platform-level app. Unlike Xero, there is no multi-tenant
// selection: one credential = one Gmail mailbox.
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

import { REDIS_CLIENT } from '../../../../../infrastructure/redis/redis.constants';
import type Redis from 'ioredis';

import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../../../provider-credentials/schemas/provider-credentials.schema';
import { CryptoService } from '../../../../common/security/crypto.service';
import { OAuthApplicationsService } from '../../../oauth-applications/oauth-applications.service';

import type { OAuthEmailCredentials } from './oauth-email.types';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_ACCESS_TOKEN_TTL_SEC,
  GOOGLE_TOKEN_REFRESH_BUFFER_SEC,
  GMAIL_DEFAULT_SCOPES,
  type GoogleTokenResponse,
  type GmailOAuthStateData,
} from './gmail-oauth.types';

// ─── Redis key builders ───────────────────────────────────────────────────────

const STATE_KEY = (state: string) => `gmail:oauth:state:${state}`;
const REFRESH_LOCK_KEY = (credentialId: string) =>
  `gmail:refresh:lock:${credentialId}`;

const STATE_TTL_SEC = 600; // 10 minutes
const REFRESH_LOCK_TTL_SEC = 30;

// ─── Safe logging helpers ─────────────────────────────────────────────────────

/** Returns first 4 chars + '...' — safe for log lines. Never logs full tokens. */
function redactToken(token: string | undefined): string {
  if (!token || token.length < 5) return '[empty]';
  return `${token.substring(0, 4)}...[redacted]`;
}

@Injectable()
export class GmailOAuthService {
  private readonly logger = new Logger(GmailOAuthService.name);

  private readonly apiBaseUrl: string;
  private readonly frontendReturnUrl: string;
  private readonly scopes: string;

  constructor(
    @InjectModel(ProviderCredentials.name)
    private readonly credModel: Model<ProviderCredentialsDocument>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
    private readonly oauthApplications: OAuthApplicationsService,
  ) {
    this.apiBaseUrl = this.config.get<string>(
      'API_BASE_URL',
      'http://localhost:3001',
    );
    this.frontendReturnUrl = this.config.get<string>(
      'GOOGLE_EMAIL_OAUTH_FRONTEND_RETURN_URL',
      'http://localhost:3000/provider-credentials',
    );
    this.scopes = this.config.get<string>(
      'GOOGLE_EMAIL_OAUTH_SCOPES',
      GMAIL_DEFAULT_SCOPES,
    );
  }

  // ─── Client credential resolution (own vs. reused OAuth application) ────────

  /**
   * Resolves the clientId/clientSecret to use for this credential — either
   * its own (bring-your-own-app) or, when `oauthApplicationId` is set, the
   * ones from a reusable OAuthApplication registration shared across
   * channels (e.g. the same Google app backing Email and Identity).
   */
  async resolveClientCredentials(
    decrypted: OAuthEmailCredentials,
    companyId: string,
  ): Promise<{ clientId: string; clientSecret: string }> {
    if (decrypted.oauthApplicationId) {
      return this.oauthApplications.readDecryptedForCompany({
        oauthApplicationId: decrypted.oauthApplicationId,
        companyId,
      });
    }
    if (!decrypted.clientId || !decrypted.clientSecret) {
      throw new HttpException(
        'The credential is missing clientId or clientSecret. ' +
          'Enter your Google OAuth application credentials, or reuse an existing one, and save before connecting.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { clientId: decrypted.clientId, clientSecret: decrypted.clientSecret };
  }

  // ─── Redirect URI ────────────────────────────────────────────────────────────

  /** The callback URL registered in the Google Cloud OAuth client. */
  get callbackUrl(): string {
    return `${this.apiBaseUrl}/relay/channels/oauth/gmail/callback`;
  }

  // ─── PKCE helpers ────────────────────────────────────────────────────────────

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private deriveCodeChallenge(codeVerifier: string): string {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  }

  // ─── OAuth state (Redis) ─────────────────────────────────────────────────────

  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async storeOAuthState(data: GmailOAuthStateData): Promise<string> {
    const state = this.generateState();
    await this.redis.set(
      STATE_KEY(state),
      JSON.stringify(data),
      'EX',
      STATE_TTL_SEC,
    );
    return state;
  }

  /** Consumes the OAuth state from Redis (single-use). Null if missing/expired. */
  async consumeOAuthState(state: string): Promise<GmailOAuthStateData | null> {
    const key = STATE_KEY(state);
    const raw = await this.redis.get(key);
    if (!raw) return null;
    await this.redis.del(key);
    try {
      return JSON.parse(raw) as GmailOAuthStateData;
    } catch {
      this.logger.warn(`[gmail-oauth] Failed to parse state for key=${key}`);
      return null;
    }
  }

  // ─── Authorization URL ───────────────────────────────────────────────────────

  /**
   * Builds a Google authorization URL and stores the state + PKCE verifier
   * server-side in Redis. `access_type=offline` + `prompt=consent` guarantee
   * a refresh_token is returned even on a re-consent.
   */
  async buildAuthorizationUrl(params: {
    companyId: string;
    providerCredentialsId: string;
    clientId: string;
    returnPath?: string;
  }): Promise<{ authorizationUrl: string; state: string }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.deriveCodeChallenge(codeVerifier);

    const stateData: GmailOAuthStateData = {
      companyId: params.companyId,
      providerCredentialsId: params.providerCredentialsId,
      codeVerifier,
      returnPath: this.sanitizeReturnPath(params.returnPath),
      createdAt: Math.floor(Date.now() / 1000),
    };

    const state = await this.storeOAuthState(stateData);

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', this.callbackUrl);
    url.searchParams.set('scope', this.scopes);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');

    return { authorizationUrl: url.toString(), state };
  }

  /** Validates and sanitizes a return path. Allows only relative paths. */
  private sanitizeReturnPath(returnPath?: string): string | undefined {
    if (!returnPath) return undefined;
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(returnPath)) return undefined;
    if (returnPath.startsWith('//')) return undefined;
    return returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  }

  // ─── Token exchange ──────────────────────────────────────────────────────────

  /** Exchanges an authorization code for Google tokens (PKCE). Never logs the code/tokens. */
  async exchangeAuthorizationCode(params: {
    code: string;
    codeVerifier: string;
    clientId: string;
    clientSecret: string;
  }): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: this.callbackUrl,
      code_verifier: params.codeVerifier,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      this.logger.warn(`[gmail-oauth] Code exchange failed: ${errMsg}`);
      throw new HttpException(
        `Google authorization failed: ${errMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await res.json()) as GoogleTokenResponse;
    this.logger.log(
      `[gmail-oauth] Code exchange succeeded; token=${redactToken(data.access_token)}`,
    );
    return data;
  }

  // ─── Token refresh ───────────────────────────────────────────────────────────

  /**
   * Refreshes a Google access token using the stored refresh token.
   * Google does not rotate refresh tokens on use, so the existing one is kept
   * unless a new one is returned. A Redis lock prevents concurrent refresh races.
   */
  async refreshAndPersist(params: {
    credentialId: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    decryptedCreds: OAuthEmailCredentials;
  }): Promise<string> {
    const lockKey = REFRESH_LOCK_KEY(params.credentialId);

    const acquired = await this.redis.set(
      lockKey,
      '1',
      'EX',
      REFRESH_LOCK_TTL_SEC,
      'NX',
    );

    if (!acquired) {
      await new Promise<void>((r) => setTimeout(r, 1500));
      const fresh = await this.readAndDecryptCredential(params.credentialId);
      if (fresh) {
        const nowSec = Math.floor(Date.now() / 1000);
        const expiresAtSec = fresh.expiresAt
          ? Math.floor(new Date(fresh.expiresAt).getTime() / 1000)
          : 0;
        if (
          fresh.accessToken &&
          expiresAtSec - nowSec > GOOGLE_TOKEN_REFRESH_BUFFER_SEC
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
      const newExpiresAt = new Date(
        (nowSec + (newTokens.expires_in ?? GOOGLE_ACCESS_TOKEN_TTL_SEC)) * 1000,
      ).toISOString();

      const updatedCreds: OAuthEmailCredentials = {
        ...params.decryptedCreds,
        accessToken: newTokens.access_token,
        // Google usually omits refresh_token on refresh — keep the existing one.
        refreshToken: newTokens.refresh_token ?? params.refreshToken,
        expiresAt: newExpiresAt,
        scopes: newTokens.scope
          ? newTokens.scope.split(' ')
          : params.decryptedCreds.scopes,
      };

      const encrypted = this.crypto.encryptJson(updatedCreds);
      await this.credModel.updateOne(
        { _id: new Types.ObjectId(params.credentialId) },
        { $set: { encrypted } },
      );

      this.logger.log(
        `[gmail-oauth] Token refreshed for credentialId=${params.credentialId}; ` +
          `new token=${redactToken(newTokens.access_token)} expiresAt=${newExpiresAt}`,
      );

      return newTokens.access_token;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async doRefreshRequest(params: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
          'Google refresh token is invalid or expired — re-authorization required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      this.logger.warn(`[gmail-oauth] Token refresh failed: ${errDesc}`);
      throw new HttpException(
        `Google token refresh failed: ${errDesc}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return res.json() as Promise<GoogleTokenResponse>;
  }

  /** Ensures a fresh (non-expired) access token, refreshing if within the buffer window. */
  async ensureFreshAccessToken(params: {
    credentialId: string;
    companyId: string;
    decrypted: OAuthEmailCredentials;
  }): Promise<string> {
    const { decrypted } = params;
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAtSec = decrypted.expiresAt
      ? Math.floor(new Date(decrypted.expiresAt).getTime() / 1000)
      : 0;

    if (
      decrypted.accessToken &&
      expiresAtSec - nowSec > GOOGLE_TOKEN_REFRESH_BUFFER_SEC
    ) {
      return decrypted.accessToken;
    }

    if (!decrypted.refreshToken) {
      throw new HttpException(
        'No refresh token stored for this connection — reconnect with Google',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const { clientId, clientSecret } = await this.resolveClientCredentials(
      decrypted,
      params.companyId,
    );

    return this.refreshAndPersist({
      credentialId: params.credentialId,
      clientId,
      clientSecret,
      refreshToken: decrypted.refreshToken,
      decryptedCreds: decrypted,
    });
  }

  // ─── Connection persistence ──────────────────────────────────────────────────

  /**
   * Persists Gmail OAuth tokens + the connected mailbox address into an
   * existing ProviderCredentials record.
   *
   * Bypasses ProviderCredentialsService.update() (and its contract
   * validation) intentionally — same rationale as Xero's persistTokens.
   */
  async persistTokens(params: {
    credentialId: string;
    tokenResponse: GoogleTokenResponse;
    emailAddress: string;
  }): Promise<void> {
    const existing = await this.credModel
      .findById(new Types.ObjectId(params.credentialId))
      .lean()
      .exec();

    if (!existing) {
      throw new HttpException(
        'Credential not found — cannot persist Gmail tokens',
        HttpStatus.NOT_FOUND,
      );
    }

    let currentDecrypted: OAuthEmailCredentials;
    try {
      currentDecrypted = this.crypto.decryptJson(
        (existing as any).encrypted,
      ) as OAuthEmailCredentials;
    } catch {
      currentDecrypted = {} as OAuthEmailCredentials;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = new Date(
      (nowSec +
        (params.tokenResponse.expires_in ?? GOOGLE_ACCESS_TOKEN_TTL_SEC)) *
        1000,
    ).toISOString();

    const updated: OAuthEmailCredentials = {
      ...currentDecrypted,
      providerKey: 'gmail',
      accessToken: params.tokenResponse.access_token,
      refreshToken:
        params.tokenResponse.refresh_token ?? currentDecrypted.refreshToken,
      expiresAt,
      scopes: params.tokenResponse.scope
        ? params.tokenResponse.scope.split(' ')
        : currentDecrypted.scopes,
      emailAddress: params.emailAddress,
    };

    const encrypted = this.crypto.encryptJson(updated);

    await this.credModel.updateOne(
      { _id: new Types.ObjectId(params.credentialId) },
      {
        $set: {
          encrypted,
          displayIdentifier: params.emailAddress,
        },
      },
    );

    this.logger.log(
      `[gmail-oauth] Tokens persisted for credentialId=${params.credentialId} ` +
        `emailAddress=${params.emailAddress}`,
    );
  }

  // ─── Revocation / disconnect ─────────────────────────────────────────────────

  /** Best-effort token revocation at Google. Never throws — logs and swallows failures. */
  private async revokeToken(token: string): Promise<boolean> {
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      return res.ok;
    } catch (err: any) {
      this.logger.warn(
        `[gmail-oauth] Token revocation failed: ${err?.message}`,
      );
      return false;
    }
  }

  /**
   * Disconnects a Gmail connection.
   *
   * Revokes the token at Google (best-effort) and deactivates the credential
   * locally regardless of revocation outcome — mirrors XeroConnectionService.disconnect().
   */
  async disconnect(params: {
    credentialId: string;
    companyId: string;
  }): Promise<{ disconnected: boolean; tenantName: string | null }> {
    const result = await this.readDecryptedCredential({
      credentialId: params.credentialId,
      companyId: params.companyId,
    });

    if (!result) {
      throw new HttpException(
        'Credential not found or does not belong to this company',
        HttpStatus.NOT_FOUND,
      );
    }

    const { decrypted } = result;
    const emailAddress = decrypted.emailAddress ?? null;

    if (decrypted.accessToken) {
      const revoked = await this.revokeToken(decrypted.accessToken);
      this.logger.log(
        `[gmail-oauth] Revocation ${revoked ? 'succeeded' : 'failed'} for credentialId=${params.credentialId}`,
      );
    }

    await this.credModel.updateOne(
      { _id: new Types.ObjectId(params.credentialId) },
      { $set: { isActive: false } },
    );

    this.logger.log(
      `[gmail-oauth] Disconnected credentialId=${params.credentialId} emailAddress=${emailAddress ?? 'none'}`,
    );

    return { disconnected: true, tenantName: emailAddress };
  }

  // ─── Credential reading ──────────────────────────────────────────────────────

  /**
   * Reads and decrypts a ProviderCredentials record.
   * Validates that the credential belongs to the given company via its
   * CompanyChannelProvider relationship. Returns null if not found.
   */
  async readDecryptedCredential(params: {
    credentialId: string;
    companyId: string;
  }): Promise<{ credential: any; decrypted: OAuthEmailCredentials } | null> {
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

    let decrypted: OAuthEmailCredentials;
    try {
      decrypted = this.crypto.decryptJson(
        (cred as any).encrypted,
      ) as OAuthEmailCredentials;
    } catch {
      this.logger.error(
        `[gmail-oauth] Failed to decrypt credentialId=${params.credentialId}`,
      );
      return null;
    }

    return { credential: cred, decrypted };
  }

  /** Reads and decrypts a credential by ID only (no company check) — used from the callback. */
  async readAndDecryptCredential(
    credentialId: string,
  ): Promise<OAuthEmailCredentials | null> {
    const cred = await this.credModel
      .findById(new Types.ObjectId(credentialId))
      .lean()
      .exec();
    if (!cred) return null;
    try {
      return this.crypto.decryptJson(
        (cred as any).encrypted,
      ) as OAuthEmailCredentials;
    } catch {
      return null;
    }
  }

  // ─── Frontend redirect URL builder ──────────────────────────────────────────

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

  buildErrorRedirectUrl(reason: string): string {
    const url = new URL(this.frontendReturnUrl);
    url.searchParams.set('status', 'error');
    url.searchParams.set('reason', reason.substring(0, 200));
    return url.toString();
  }
}
