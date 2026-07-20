import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthContext } from '../types/auth-context.types';

/**
 * JWT Passport strategy — validates Bearer tokens for Passport-based flows.
 *
 * The primary JWT validation path is GlobalAuthGuard (uses JwtService.verifyAsync
 * directly for full control). This strategy is retained for Passport compatibility
 * and future use with @AuthGuard('jwt') if needed.
 *
 * Token payload shape issued by AuthService.login():
 *   { sub: userId, type: 'access', iat, exp }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_ACCESS_SECRET') ??
        'phase1a-placeholder-replace-before-phase1b',
    });
  }

  async validate(payload: {
    sub: string;
    organizationId?: string;
    type?: string;
  }): Promise<AuthContext> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      actorType: 'user',
      userId: payload.sub,
      organizationId: payload.organizationId,
    };
  }
}
