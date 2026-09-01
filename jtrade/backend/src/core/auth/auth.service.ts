import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import type { GrapiflyJtradeSsoContract } from '../../integrations/grapifly/contracts/grapifly-sso.contract';
import { ApplicationRole, type AuthContext } from './types/auth-context';

export interface AuthIdentity {
  id: string;
  grapiflyUserId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  role: ApplicationRole;
  flow: 'client' | 'provider' | 'internal';
  applicationRole: string;
  accessTier: 'trial' | 'free' | 'paid';
  avatarUrl: string | null;
  isActive: true;
}

export interface AuthResponse {
  user: AuthIdentity;
  tokens: { accessToken: string; refreshToken: string };
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService, private readonly http: HttpService) {}

  async loginWithGrapifly(code: string): Promise<AuthResponse> {
    if (!code?.trim()) throw new HttpException('Missing Grapifly SSO code', HttpStatus.UNAUTHORIZED);
    const contract = await this.exchangeCode(code.trim());
    this.assertContract(contract);
    return this.buildResponse(this.identityFromContract(contract));
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = await this.jwt.verifyAsync<AuthContext>(refreshToken);
      if (payload.tokenType !== 'refresh') throw new Error('Wrong token type');
      return this.buildResponse(this.identityFromPayload(payload));
    } catch {
      throw new HttpException('Invalid or expired refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  me(context: AuthContext): AuthIdentity { return this.identityFromPayload(context); }

  private async exchangeCode(code: string): Promise<GrapiflyJtradeSsoContract> {
    const baseUrl = this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101';
    const clientSecret = this.config.get<string>('JTRADE_SERVICE_SECRET');
    if (!clientSecret) throw new HttpException('Grapifly SSO is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    try {
      const response = await firstValueFrom(this.http.post<GrapiflyJtradeSsoContract>(
        `${baseUrl.replace(/\/$/, '')}/auth/sso/exchange`, { code, appKey: 'jtrade' },
        { headers: { 'x-grapifly-sso-secret': clientSecret }, timeout: 5000 },
      ));
      return response.data;
    } catch {
      throw new HttpException('Invalid or expired Grapifly SSO code', HttpStatus.UNAUTHORIZED);
    }
  }

  private assertContract(contract: GrapiflyJtradeSsoContract) {
    if (contract.contractVersion !== 3 || contract.issuer !== 'grapifly' || contract.audience !== 'jtrade' || contract.organization.status !== 'active') {
      throw new HttpException('Unsupported Grapifly SSO contract', HttpStatus.UNAUTHORIZED);
    }
  }

  private identityFromContract(contract: GrapiflyJtradeSsoContract): AuthIdentity {
    const names = contract.displayName.trim().split(/\s+/).filter(Boolean);
    const role = contract.access.flow === 'internal' ? ApplicationRole.ADMIN : contract.access.flow === 'provider' ? ApplicationRole.PROVIDER : ApplicationRole.CLIENT;
    return {
      id: contract.grapiflyUserId, grapiflyUserId: contract.grapiflyUserId,
      organizationId: contract.organization.organizationId,
      firstName: names[0] || contract.email.split('@')[0], lastName: names.slice(1).join(' '),
      displayName: contract.displayName, email: contract.email.toLowerCase().trim(), role,
      flow: contract.access.flow, applicationRole: contract.access.applicationRole,
      accessTier: contract.access.tier, avatarUrl: contract.avatarUrl, isActive: true,
    };
  }

  private identityFromPayload(payload: AuthContext): AuthIdentity {
    const names = payload.displayName.trim().split(/\s+/).filter(Boolean);
    return {
      id: payload.grapiflyUserId, grapiflyUserId: payload.grapiflyUserId,
      organizationId: payload.organizationId, firstName: names[0] || payload.email.split('@')[0],
      lastName: names.slice(1).join(' '), displayName: payload.displayName, email: payload.email,
      role: payload.role, flow: payload.flow, applicationRole: payload.applicationRole,
      accessTier: payload.accessTier, avatarUrl: payload.avatarUrl, isActive: true,
    };
  }

  private async buildResponse(identity: AuthIdentity): Promise<AuthResponse> {
    const base = {
      sub: identity.grapiflyUserId, grapiflyUserId: identity.grapiflyUserId,
      organizationId: identity.organizationId, flow: identity.flow, role: identity.role,
      applicationRole: identity.applicationRole, accessTier: identity.accessTier,
      email: identity.email, displayName: identity.displayName, avatarUrl: identity.avatarUrl,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...base, tokenType: 'access' }, { expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m' }),
      this.jwt.signAsync({ ...base, tokenType: 'refresh' }, { expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d' }),
    ]);
    return { user: identity, tokens: { accessToken, refreshToken } };
  }
}
