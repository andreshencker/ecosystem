import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { firstValueFrom } from 'rxjs';

import { EcosystemIdentityService } from '../ecosystem/identity/ecosystem-identity.service';
import { EcosystemUserResponseDto } from '../ecosystem/identity/dto/ecosystem-user-response.dto';
import type {
  UserRole,
  UserScope,
} from '../ecosystem/identity/schemas/ecosystem-user.schema';
import type { GrapiflyRelaySsoContract } from '../ecosystem/contracts/grapifly-ecosystem.contract';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { AuthResponseDto, TokensOnlyDto } from './dto/auth-response.dto';

export interface SwitchableOrganization {
  organizationId: string;
  name: string;
  slug: string;
  isPlatform: boolean;
  isDefault: boolean;
  membership?: { role: 'owner' | 'admin' | 'member' };
  applicationRole?: 'owner' | 'admin' | 'operator' | 'viewer';
}

interface RelaySessionContext {
  companyId: string;
  companyKey: string;
  grapiflyOrganizationId: string | null;
  role: UserRole;
  scope: UserScope;
  permissions?: string[];
}

/**
 * Relay session boundary.
 *
 * Grapifly owns credentials, authentication, users, organizations, roles and
 * invitations. Relay only exchanges a short-lived Grapifly SSO code and owns
 * the application session required to access Relay resources.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly identity: EcosystemIdentityService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    @InjectModel(RefreshToken.name)
    private readonly tokenModel: Model<RefreshTokenDocument>,
  ) {}

  async loginWithGrapifly(code: string): Promise<AuthResponseDto> {
    if (!code) throw new UnauthorizedException('Missing Grapifly SSO code');

    const baseUrl =
      this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101';
    const clientSecret = this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');
    if (!clientSecret) {
      throw new UnauthorizedException('Grapifly SSO is not configured');
    }

    let contract: GrapiflyRelaySsoContract;
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${baseUrl.replace(/\/$/, '')}/auth/sso/exchange`,
          { code, appKey: 'relay' },
          {
            headers: { 'x-grapifly-sso-secret': clientSecret },
            timeout: 5000,
          },
        ),
      );
      contract = response.data;
    } catch {
      throw new UnauthorizedException('Invalid or expired Grapifly SSO code');
    }

    this.assertContract(contract);
    const company = await this.identity.resolveGrapiflyCompany(contract);
    const role = this.toRelayRole(contract);
    const scope: UserScope = role === 'platform_admin' ? 'global' : 'company';
    const sessionContext: RelaySessionContext = {
      companyId: String(company._id),
      companyKey: company.companyKey,
      grapiflyOrganizationId: contract.organization.organizationId,
      role,
      scope,
      permissions: contract.access.permissions,
    };

    const user = await this.identity.linkGrapiflyIdentity(
      contract,
      sessionContext,
    );
    if (!user.isActive) {
      throw new ForbiddenException('Relay account is inactive');
    }

    const tokens = await this.issueTokens(String(user._id), sessionContext);
    const responseUser = EcosystemUserResponseDto.from(user);
    responseUser.companyId = sessionContext.companyId;
    responseUser.companyKey = sessionContext.companyKey;
    responseUser.role = sessionContext.role;
    responseUser.scope = sessionContext.scope;
    return { ...tokens, user: responseUser };
  }

  /**
   * Organizations the given Relay user can switch into — i.e. where they have
   * an active Grapifly membership AND active 'relay' application access.
   * Used to populate the global organization switcher.
   */
  async listSwitchableOrganizations(
    relayUserId: string,
  ): Promise<SwitchableOrganization[]> {
    const user = await this.identity.findByIdOrThrow(relayUserId);
    if (!user.grapiflyUserId) return [];

    const baseUrl =
      this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101';
    const clientSecret = this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');
    if (!clientSecret) return [];

    try {
      const response = await firstValueFrom(
        this.http.get<{ organizations?: SwitchableOrganization[] }>(
          `${baseUrl.replace(/\/$/, '')}/internal/apps/relay/organizations`,
          {
            headers: {
              'x-grapifly-sso-secret': clientSecret,
              'x-grapifly-user-id': user.grapiflyUserId,
            },
            timeout: 5000,
          },
        ),
      );
      return response.data.organizations ?? [];
    } catch (err) {
      this.logger.warn(
        `Failed to list switchable organizations for userId=${relayUserId}: ${(err as Error).message}`,
      );
      return [];
    }
  }

  async refreshTokens(rawRefreshToken: string): Promise<TokensOnlyDto> {
    const tokenHash = this.sha256(rawRefreshToken);
    const stored = await this.tokenModel.findOne({ tokenHash }).lean().exec();

    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    if (stored.isRevoked) {
      this.logger.warn(
        `Refresh token reuse detected for userId=${stored.userId}. Revoking all sessions.`,
      );
      await this.revokeAllTokensForUser(String(stored.userId));
      throw new UnauthorizedException(
        'Refresh token already used. All sessions have been revoked for security.',
      );
    }
    if (new Date() > stored.expiresAt) {
      throw new UnauthorizedException(
        'Refresh token has expired. Please log in again.',
      );
    }
    if (
      !stored.companyId ||
      !stored.companyKey ||
      !stored.grapiflyOrganizationId ||
      !stored.role ||
      !stored.scope
    ) {
      throw new UnauthorizedException(
        'Legacy Relay session is no longer supported. Sign in with Grapifly ID.',
      );
    }

    const newTokens = await this.issueTokens(String(stored.userId), {
      companyId: stored.companyId,
      companyKey: stored.companyKey,
      grapiflyOrganizationId: stored.grapiflyOrganizationId,
      role: stored.role as UserRole,
      scope: stored.scope as UserScope,
      permissions: stored.permissions ?? [],
    });

    await this.tokenModel.findByIdAndUpdate(stored._id, {
      $set: {
        isRevoked: true,
        replacedByTokenHash: this.sha256(newTokens.refreshToken),
      },
    });
    return newTokens;
  }

  async logout(rawRefreshToken: string): Promise<{ message: string }> {
    await this.tokenModel.findOneAndUpdate(
      { tokenHash: this.sha256(rawRefreshToken), isRevoked: false },
      { $set: { isRevoked: true } },
    );
    return { message: 'Logged out successfully' };
  }

  private assertContract(contract: GrapiflyRelaySsoContract): void {
    if (
      contract.contractVersion !== 2 ||
      contract.issuer !== 'grapifly' ||
      contract.audience !== 'relay'
    ) {
      throw new UnauthorizedException('Unsupported Grapifly SSO contract');
    }
  }

  private toRelayRole(contract: GrapiflyRelaySsoContract): UserRole {
    const role = contract.access.applicationRole;
    if (contract.organization.isPlatform && role === 'owner') {
      return 'platform_admin';
    }
    if (role === 'owner') return 'company_owner';
    if (role === 'admin') return 'company_admin';
    if (role === 'viewer') return 'viewer';
    return 'operator';
  }

  private async issueTokens(
    userId: string,
    context: RelaySessionContext,
  ): Promise<TokensOnlyDto> {
    const expiresIn = this.accessTokenExpiresInSeconds();
    const accessToken = await this.jwt.signAsync({
      sub: userId,
      type: 'access',
      companyId: context.companyId,
      companyKey: context.companyKey,
      organizationId: context.grapiflyOrganizationId,
      role: context.role,
      scope: context.scope,
      permissions: context.permissions ?? [],
    });

    const rawRefreshToken = randomBytes(32).toString('hex');
    await this.tokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: this.sha256(rawRefreshToken),
      isRevoked: false,
      expiresAt: this.refreshTokenExpiresAt(),
      companyId: context.companyId,
      companyKey: context.companyKey,
      grapiflyOrganizationId: context.grapiflyOrganizationId,
      role: context.role,
      scope: context.scope,
      permissions: context.permissions ?? [],
    });

    return { accessToken, refreshToken: rawRefreshToken, expiresIn };
  }

  private async revokeAllTokensForUser(userId: string): Promise<void> {
    await this.tokenModel.updateMany(
      { userId: new Types.ObjectId(userId), isRevoked: false },
      { $set: { isRevoked: true } },
    );
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private accessTokenExpiresInSeconds(): number {
    return this.parseDurationToSeconds(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      900,
    );
  }

  private refreshTokenExpiresAt(): Date {
    const seconds = this.parseDurationToSeconds(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      7 * 86400,
    );
    return new Date(Date.now() + seconds * 1000);
  }

  private parseDurationToSeconds(raw: string, fallback: number): number {
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return fallback;
    const multiplier: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return parseInt(match[1], 10) * multiplier[match[2]];
  }
}
