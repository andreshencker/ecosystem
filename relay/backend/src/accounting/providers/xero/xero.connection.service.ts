// src/accounting/providers/xero/xero.connection.service.ts
//
// Xero connection management: token freshness, verification, disconnection.
//
// This service sits above XeroOAuthService and uses it to:
//   - Ensure a fresh access token before any Xero API call.
//   - Verify the connection by reading the organisation (non-destructive).
//   - Disconnect by revoking the Xero connection and deactivating the credential.

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../../../communication/channels/provider-credentials/schemas/provider-credentials.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../../../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';

import { XeroOAuthService } from './xero.oauth.service';
import type { XeroOAuthCredentials } from './xero.credentials.contract';
import {
  XERO_ACCOUNTING_BASE_URL,
  XERO_CONNECTIONS_URL,
  XERO_TOKEN_REFRESH_BUFFER_SEC,
  type XeroConnectionStatus,
  type XeroOrganisationSummary,
} from './xero.oauth.types';

@Injectable()
export class XeroConnectionService {
  private readonly logger = new Logger(XeroConnectionService.name);

  constructor(
    @InjectModel(ProviderCredentials.name)
    private readonly credModel: Model<ProviderCredentialsDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    private readonly oauthService: XeroOAuthService,
  ) {}

  // ─── Token freshness ─────────────────────────────────────────────────────────

  /**
   * Returns a valid Xero access token for the given credential.
   *
   * If the stored access token is within the safety window of expiry, a token
   * refresh is performed, the new tokens are persisted, and the fresh access
   * token is returned.
   *
   * This method is the single entry point for all Xero API calls that need a
   * fresh token. It never returns an expired or near-expired token.
   *
   * Throws when:
   *   - No refresh token is available (re-authorization required).
   *   - Xero rejects the refresh token (invalid_grant).
   *   - Network failure or Xero unavailability.
   */
  async ensureFreshAccessToken(params: {
    credentialId: string;
    decrypted: XeroOAuthCredentials;
  }): Promise<string> {
    const { credentialId, decrypted } = params;
    const nowSec = Math.floor(Date.now() / 1000);

    // Check whether the stored access token is still usable.
    if (
      decrypted.accessToken &&
      decrypted.expiresAt &&
      decrypted.expiresAt - nowSec > XERO_TOKEN_REFRESH_BUFFER_SEC
    ) {
      return decrypted.accessToken;
    }

    // Access token is missing or about to expire — refresh it.
    if (!decrypted.refreshToken) {
      throw new HttpException(
        'No Xero refresh token available — please re-authorize the Xero connection',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!decrypted.clientId || !decrypted.clientSecret) {
      throw new HttpException(
        'Xero OAuth app credentials (clientId, clientSecret) are missing from the credential record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(
      `[xero-conn] Access token expired or near-expiry for credentialId=${credentialId} — refreshing`,
    );

    return this.oauthService.refreshAndPersist({
      credentialId,
      clientId: decrypted.clientId,
      clientSecret: decrypted.clientSecret,
      refreshToken: decrypted.refreshToken,
      decryptedCreds: decrypted,
    });
  }

  // ─── Connection verification ─────────────────────────────────────────────────

  /**
   * Verifies a Xero connection by calling the organisations endpoint.
   *
   * Uses `GET /api.xro/2.0/Organisations` — a read-only, non-destructive call
   * that is recommended by Xero as a keep-alive / connectivity check.
   *
   * Returns safe canonical information only. No tokens are returned.
   */
  async verifyConnection(params: {
    credentialId: string;
    companyId: string;
  }): Promise<XeroConnectionStatus> {
    const checkedAt = new Date().toISOString();

    const result = await this.oauthService.readDecryptedCredential({
      credentialId: params.credentialId,
      companyId: params.companyId,
    });

    if (!result) {
      return {
        connected: false,
        providerKey: 'xero',
        tenantIdHint: null,
        tenantName: null,
        organisationName: null,
        grantedScopes: null,
        tokenExpiresAt: null,
        checkedAt,
        reason: 'Credential not found or does not belong to this company',
      };
    }

    const { decrypted } = result;

    if (!decrypted.tenantId) {
      return {
        connected: false,
        providerKey: 'xero',
        tenantIdHint: null,
        tenantName: null,
        organisationName: null,
        grantedScopes: decrypted.scopes ?? null,
        tokenExpiresAt: null,
        checkedAt,
        reason:
          'No Xero tenant ID found — complete the OAuth authorization flow first',
      };
    }

    try {
      const accessToken = await this.ensureFreshAccessToken({
        credentialId: params.credentialId,
        decrypted,
      });

      const org = await this.fetchOrganisation(accessToken, decrypted.tenantId);

      const expiresAt = decrypted.expiresAt
        ? new Date(decrypted.expiresAt * 1000).toISOString()
        : null;

      return {
        connected: true,
        providerKey: 'xero',
        tenantIdHint: this.redactTenantId(decrypted.tenantId),
        tenantName: this.deriveTenantName(result.credential),
        organisationName: org?.Name ?? null,
        grantedScopes: decrypted.scopes ?? null,
        tokenExpiresAt: expiresAt,
        checkedAt,
      };
    } catch (err: any) {
      const reason: string =
        err instanceof HttpException
          ? ((err.getResponse() as any)?.message ?? String(err.message))
          : String(err?.message ?? 'Unknown error');

      this.logger.warn(
        `[xero-conn] Connection verification failed for credentialId=${params.credentialId}: ${reason}`,
      );

      return {
        connected: false,
        providerKey: 'xero',
        tenantIdHint: this.redactTenantId(decrypted.tenantId),
        tenantName: null,
        organisationName: null,
        grantedScopes: decrypted.scopes ?? null,
        tokenExpiresAt: null,
        checkedAt,
        reason,
      };
    }
  }

  /**
   * Fetches the organisation summary from Xero.
   *
   * GET /api.xro/2.0/Organisations
   * Headers: Authorization: Bearer {token}, xero-tenant-id: {tenantId}
   *
   * Returns null on failure so the caller can surface a graceful error.
   */
  private async fetchOrganisation(
    accessToken: string,
    tenantId: string,
  ): Promise<XeroOrganisationSummary | null> {
    const url = `${XERO_ACCOUNTING_BASE_URL}/Organisations`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'xero-tenant-id': tenantId,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      this.logger.warn(
        `[xero-conn] GET /Organisations failed: status=${res.status} tenantId=${tenantId}`,
      );
      throw new HttpException(
        `Xero organisation lookup failed (status ${res.status}) — check scopes and tenant access`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await res.json()) as {
      Organisations?: XeroOrganisationSummary[];
    };
    return data?.Organisations?.[0] ?? null;
  }

  // ─── Disconnection ───────────────────────────────────────────────────────────

  /**
   * Disconnects a Xero connection.
   *
   * 1. Reads and decrypts the credential.
   * 2. Gets a fresh access token.
   * 3. Looks up the connectionId from Xero's connections endpoint.
   * 4. Revokes the connection via DELETE /connections/{connectionId}.
   * 5. Deactivates the ProviderCredentials record.
   *
   * After disconnection, external applications can no longer use this
   * credential for Xero API calls. The credential record remains in the
   * database (deactivated) for audit purposes.
   */
  async disconnect(params: {
    credentialId: string;
    companyId: string;
  }): Promise<{ disconnected: boolean; tenantName: string | null }> {
    const result = await this.oauthService.readDecryptedCredential({
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
    const tenantName = this.deriveTenantName(result.credential);

    let accessToken: string | null = null;
    let connectionRevoked = false;

    // Attempt to revoke the connection at Xero.
    // If this fails (e.g. already revoked, network error), we still
    // deactivate the credential locally.
    try {
      accessToken = await this.ensureFreshAccessToken({
        credentialId: params.credentialId,
        decrypted,
      });

      if (decrypted.tenantId) {
        // Find the connectionId matching this tenant.
        const connections =
          await this.oauthService.listConnections(accessToken);
        const conn = connections.find((c) => c.tenantId === decrypted.tenantId);

        if (conn) {
          await this.oauthService.revokeConnection({
            accessToken,
            connectionId: conn.id,
          });
          connectionRevoked = true;
        } else {
          this.logger.warn(
            `[xero-conn] No Xero connection found for tenantId=${decrypted.tenantId} — ` +
              'may already be revoked. Deactivating credential locally.',
          );
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `[xero-conn] Xero revocation failed for credentialId=${params.credentialId}: ${err?.message}. ` +
          'Proceeding with local deactivation.',
      );
    }

    // Deactivate the credential record.
    await this.credModel.updateOne(
      { _id: new Types.ObjectId(params.credentialId) },
      { $set: { isActive: false } },
    );

    this.logger.log(
      `[xero-conn] Disconnected credentialId=${params.credentialId} ` +
        `tenantId=${decrypted.tenantId ?? 'none'} ` +
        `xeroRevoked=${connectionRevoked}`,
    );

    return { disconnected: true, tenantName };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Returns a redacted tenant ID safe for logging and display.
   * Shows first 8 and last 4 characters of the UUID.
   */
  private redactTenantId(tenantId: string | undefined): string | null {
    if (!tenantId || tenantId.length < 12) return null;
    return `${tenantId.substring(0, 8)}...${tenantId.substring(tenantId.length - 4)}`;
  }

  /** Derives the tenant display name from the credential's displayIdentifier. */
  private deriveTenantName(credential: any): string | null {
    const di = credential?.displayIdentifier;
    if (!di || typeof di !== 'string') return null;
    // displayIdentifier is set to tenantName after OAuth; clientId is the fallback.
    // If it looks like a clientId (contains only hex-like chars without spaces),
    // return null so the caller knows there's no human-readable name yet.
    return di.includes(' ') || di.length < 30 ? di : null;
  }

  /**
   * Fetches all Xero connections for verification after listing connections.
   * Exposed for use by the controller in multi-tenant scenarios.
   */
  async listConnectionsForCredential(params: {
    credentialId: string;
    companyId: string;
  }): Promise<Array<{
    connectionId: string;
    tenantId: string;
    tenantName: string | null;
    tenantType: string;
  }> | null> {
    const result = await this.oauthService.readDecryptedCredential({
      credentialId: params.credentialId,
      companyId: params.companyId,
    });
    if (!result) return null;

    try {
      const accessToken = await this.ensureFreshAccessToken({
        credentialId: params.credentialId,
        decrypted: result.decrypted,
      });
      const conns = await this.oauthService.listConnections(accessToken);
      return conns.map((c) => ({
        connectionId: c.id,
        tenantId: c.tenantId,
        tenantName: c.tenantName,
        tenantType: c.tenantType,
      }));
    } catch (err: any) {
      this.logger.warn(
        `[xero-conn] listConnectionsForCredential failed: ${err?.message}`,
      );
      return null;
    }
  }
}
