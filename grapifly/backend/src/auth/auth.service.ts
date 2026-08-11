import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GoogleIdentity, UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async loginWithGoogle(identity: GoogleIdentity) {
    if (!identity.emailVerified) throw new UnauthorizedException('Google email must be verified');
    const user = await this.users.upsertGoogleIdentity(identity);
    const sessionToken = await this.jwt.signAsync({ sub: user.grapiflyUserId, type: 'session' });
    return { user, sessionToken };
  }

  getUser(grapiflyUserId: string) {
    return this.users.findByGrapiflyUserId(grapiflyUserId);
  }
}
