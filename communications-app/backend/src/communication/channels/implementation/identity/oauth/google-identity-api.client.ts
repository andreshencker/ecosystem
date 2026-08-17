// src/communication/channels/implementation/identity/oauth/google-identity-api.client.ts
//
// Thin wrapper around Google's OpenID userinfo endpoint — used both to
// verify a connection is live and to derive the signed-in user's profile.

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import { GOOGLE_USERINFO_URL, type GoogleUserInfo } from './identity-oauth.types';

@Injectable()
export class GoogleIdentityApiClient {
  private readonly logger = new Logger(GoogleIdentityApiClient.name);

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const message = String(
        (errBody['error'] as any)?.message ?? errBody['error'] ?? res.status,
      );
      this.logger.warn(`[google-identity-api] userinfo failed: ${res.status} ${message}`);

      if (res.status === 401) {
        throw new HttpException(
          'Google access token rejected — reconnect with Google',
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw new HttpException(
        `Google userinfo request failed: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return res.json() as Promise<GoogleUserInfo>;
  }
}
