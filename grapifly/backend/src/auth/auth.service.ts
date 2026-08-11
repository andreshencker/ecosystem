import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { GoogleIdentity, UsersService } from '../users/users.service';
import { SsoCode, SsoCodeDocument } from './schemas/sso-code.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectModel(SsoCode.name) private readonly ssoCodes: Model<SsoCodeDocument>,
  ) {}

  async loginWithGoogle(identity: GoogleIdentity) {
    if (!identity.emailVerified) throw new UnauthorizedException('Google email must be verified');
    const user = await this.users.upsertGoogleIdentity(identity);
    const sessionToken = await this.jwt.signAsync({ sub: user.grapiflyUserId, type: 'session' });
    return { user, sessionToken };
  }

  async getUser(grapiflyUserId: string) {
    return this.users.findByGrapiflyUserId(grapiflyUserId);
  }

  async resolveSession(token: string | undefined) {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; type: 'session' }>(token);
      return payload.type === 'session' ? payload : null;
    } catch {
      return null;
    }
  }

  async createRelaySsoCode(grapiflyUserId: string) {
    const user = await this.users.findByGrapiflyUserId(grapiflyUserId);
    if (!user) throw new UnauthorizedException('Grapifly account is inactive');
    const code = randomBytes(32).toString('base64url');
    await this.ssoCodes.create({
      codeHash: this.hash(code),
      grapiflyUserId,
      appKey: 'relay',
      expiresAt: new Date(Date.now() + 60_000),
    });
    return code;
  }

  async exchangeSsoCode(code: string, appKey: string, clientSecret: string | undefined) {
    if (appKey !== 'relay' || !this.validClientSecret(clientSecret)) {
      throw new UnauthorizedException('Invalid SSO client');
    }
    const now = new Date();
    const grant = await this.ssoCodes.findOneAndUpdate(
      { codeHash: this.hash(code), appKey: 'relay', consumedAt: null, expiresAt: { $gt: now } },
      { $set: { consumedAt: now } },
      { new: true },
    ).lean();
    if (!grant) throw new UnauthorizedException('Invalid or expired SSO code');
    const user = await this.users.findByGrapiflyUserId(grant.grapiflyUserId);
    if (!user) throw new UnauthorizedException('Grapifly account is inactive');
    return {
      grapiflyUserId: user.grapiflyUserId,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private validClientSecret(candidate: string | undefined) {
    const expected = this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');
    if (!candidate || !expected) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
