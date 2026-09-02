// src/communication/channels/implementation/identity/oauth/google-identity-oauth.service.ts
//
// Google "Sign in with Google" OAuth 2.0 core operations — structurally
// identical to GmailOAuthService (same PKCE + Redis state + token exchange
// mechanics), scoped to the Identity channel instead of Email. Both channels
// can share the same underlying Google app via OAuthApplication reuse.

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

import type { IdentityOAuthCredentials } from './identity-oauth.types';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_ACCESS_TOKEN_TTL_SEC,
  GOOGLE_TOKEN_REFRESH_BUFFER_SEC,
  GOOGLE_IDENTITY_DEFAULT_SCOPES,
  type GoogleTokenResponse,
  type IdentityOAuthStateData,
} from './identity-oauth.types';

const STATE_KEY = (state: string) => `identity:google:oauth:state:${state}`;
const REFRESH_LOCK_KEY = (credentialId: string) =>
  `identity:google:refresh:lock:${credentialId}`;

const STATE_TTL_SEC = 600;
const REFRESH_LOCK_TTL_SEC = 30;

function redactToken(token: string | undefined): string {
  if (!token || token.length < 5) return '[empty]';
  return `${token.substring(0, 4)}...[redacted]`;
}

@Injectable()
export class GoogleIdentityOAuthService {
  private readonly logger = new Logger(GoogleIdentityOAuthService.name);

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
      'GOOGLE_IDENTITY_OAUTH_FRONTEND_RETURN_URL',
      'http://localhost:3000/provider-credentials',
    );
    this.scopes = this.config.get<string>(
      'GOOGLE_IDENTITY_OAUTH_SCOPES',
      GOOGLE_IDENTITY_DEFAULT_SCOPES,
    );
  }

  // ─── Client credential resolution (own vs. reused OAuth application) ────────

  async resolveClientCredentials(
    decrypted: IdentityOAuthCredentials,
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

  get callbackUrl(): string {
    return `${this.apiBaseUrl}/relay/channels/oauth/identity/google/callback`;
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

  async storeOAuthState(data: IdentityOAuthStateData): Promise<string> {
    const state = this.generateState();
    await this.redis.set(
      STATE_KEY(state),
      JSON.stringify(data),
      'EX',
      STATE_TTL_SEC,
    );
    return state;
  }

  async consumeOAuthState(
    state: string,
  ): Promise<IdentityOAuthStateData | null> {
    const key = STATE_KEY(state);
    const raw = await this.redis.get(key);
    if (!raw) return null;
    await this.redis.del(key);
    try {
      return JSON.parse(raw) as IdentityOAuthStateData;
    } catch {
      this.logger.warn(`[identity-oauth] Failed to parse state for key=${key}`);
      return null;
    }
  }

  // ─── Authorization URL ───────────────────────────────────────────────────────

  async buildAuthorizationUrl(params: {
    companyId: string;
    providerCredentialsId: string;
    clientId: string;
    returnPath?: string;
  }): Promise<{ authorizationUrl: string; state: string }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.deriveCodeChallenge(codeVerifier);

    const stateData: IdentityOAuthStateData = {
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

  private sanitizeReturnPath(returnPath?: string): string | undefined {
    if (!returnPath) return undefined;
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(returnPath)) return undefined;
    if (returnPath.startsWith('//')) return undefined;
    return returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  }

  // ─── Token exchange ──────────────────────────────────────────────────────────

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
      this.logger.warn(`[identity-oauth] Code exchange failed: ${errMsg}`);
      throw new HttpException(
        `Google authorization failed: ${errMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await res.json()) as GoogleTokenResponse;
    this.logger.log(
      `[identity-oauth] Code exchange succeeded; token=${redactToken(data.access_token)}`,
    );
    return data;
  }

  // ─── Token refresh ───────────────────────────────────────────────────────────

  async refreshAndPersist(params: {
    credentialId: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    decryptedCreds: IdentityOAuthCredentials;
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

      const updatedCreds: IdentityOAuthCredentials = {
        ...params.decryptedCreds,
        accessToken: newTokens.access_token,
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
        `[identity-oauth] Token refreshed for credentialId=${params.credentialId}; ` +
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

      this.logger.warn(`[identity-oauth] Token refresh failed: ${errDesc}`);
      throw new HttpException(
        `Google token refresh failed: ${errDesc}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return res.json() as Promise<GoogleTokenResponse>;
  }

  async ensureFreshAccessToken(params: {
    credentialId: string;
    companyId: string;
    decrypted: IdentityOAuthCredentials;
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

  async persistTokens(params: {
    credentialId: string;
    tokenResponse: GoogleTokenResponse;
    emailAddress: string;
    displayName?: string;
    providerUserId?: string;
  }): Promise<void> {
    const existing = await this.credModel
      .findById(new Types.ObjectId(params.credentialId))
      .lean()
      .exec();

    if (!existing) {
      throw new HttpException(
        'Credential not found — cannot persist tokens',
        HttpStatus.NOT_FOUND,
      );
    }

    let currentDecrypted: IdentityOAuthCredentials;
    try {
      currentDecrypted = this.crypto.decryptJson(
        (existing as any).encrypted,
      ) as IdentityOAuthCredentials;
    } catch {
      currentDecrypted = {} as IdentityOAuthCredentials;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = new Date(
      (nowSec +
        (params.tokenResponse.expires_in ?? GOOGLE_ACCESS_TOKEN_TTL_SEC)) *
        1000,
    ).toISOString();

    const updated: IdentityOAuthCredentials = {
      ...currentDecrypted,
      providerKey: 'google_identity',
      accessToken: params.tokenResponse.access_token,
      refreshToken:
        params.tokenResponse.refresh_token ?? currentDecrypted.refreshToken,
      expiresAt,
      scopes: params.tokenResponse.scope
        ? params.tokenResponse.scope.split(' ')
        : currentDecrypted.scopes,
      emailAddress: params.emailAddress,
      displayName: params.displayName ?? currentDecrypted.displayName,
      providerUserId: params.providerUserId ?? currentDecrypted.providerUserId,
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
      `[identity-oauth] Tokens persisted for credentialId=${params.credentialId} ` +
        `emailAddress=${params.emailAddress}`,
    );
  }

  // ─── Revocation / disconnect ─────────────────────────────────────────────────

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
      this.logger.warn(`[identity-oauth] Token revocation failed: ${err?.message}`);
      return false;
    }
  }

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
        `[identity-oauth] Revocation ${revoked ? 'succeeded' : 'failed'} for credentialId=${params.credentialId}`,
      );
    }

    await this.credModel.updateOne(
      { _id: new Types.ObjectId(params.credentialId) },
      { $set: { isActive: false } },
    );

    return { disconnected: true, tenantName: emailAddress };
  }

  // ─── Credential reading ──────────────────────────────────────────────────────

  async readDecryptedCredential(params: {
    credentialId: string;
    companyId: string;
  }): Promise<{ credential: any; decrypted: IdentityOAuthCredentials } | null> {
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

    let decrypted: IdentityOAuthCredentials;
    try {
      decrypted = this.crypto.decryptJson(
        (cred as any).encrypted,
      ) as IdentityOAuthCredentials;
    } catch {
      this.logger.error(
        `[identity-oauth] Failed to decrypt credentialId=${params.credentialId}`,
      );
      return null;
    }

    return { credential: cred, decrypted };
  }

  async readAndDecryptCredential(
    credentialId: string,
  ): Promise<IdentityOAuthCredentials | null> {
    const cred = await this.credModel
      .findById(new Types.ObjectId(credentialId))
      .lean()
      .exec();
    if (!cred) return null;
    try {
      return this.crypto.decryptJson(
        (cred as any).encrypted,
      ) as IdentityOAuthCredentials;
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
