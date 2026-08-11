import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface SessionRequest extends Request {
  grapiflySession?: { sub: string; type: 'session' };
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const token = request.cookies?.grapifly_session as string | undefined;
    if (!token) throw new UnauthorizedException('No Grapifly session');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; type: 'session' }>(token);
      if (payload.type !== 'session') throw new Error('Invalid token type');
      request.grapiflySession = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid Grapifly session');
    }
  }
}
