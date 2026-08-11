import { Body, Controller, Get, Headers, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SessionGuard, SessionRequest } from './session.guard';
import { GoogleIdentity } from '../users/users.service';
import { GoogleAuthGuard } from './google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() request: Request, @Res() response: Response) {
    const { sessionToken } = await this.auth.loginWithGoogle(request.user as GoogleIdentity);
    response.cookie('grapifly_session', sessionToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return response.redirect(`${this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100'}/home`);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() request: SessionRequest) {
    return this.auth.getUser(request.grapiflySession!.sub);
  }

  @Post('logout')
  logout(@Res() response: Response) {
    response.clearCookie('grapifly_session', { path: '/' });
    return response.status(204).send();
  }

  @Get('logout/relay')
  logoutFromRelay(@Res() response: Response) {
    response.clearCookie('grapifly_session', { path: '/' });
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100';
    return response.redirect(`${frontendUrl.replace(/\/$/, '')}/?signedOut=true`);
  }

  @Get('sso/relay')
  @UseGuards(SessionGuard)
  async relaySso(@Req() request: SessionRequest, @Res() response: Response) {
    const code = await this.auth.createRelaySsoCode(request.grapiflySession!.sub);
    const callback = this.config.get<string>('RELAY_SSO_CALLBACK_URL') ?? 'http://localhost:3000/auth/grapifly/callback';
    return response.redirect(`${callback}?code=${encodeURIComponent(code)}`);
  }

  @Post('sso/exchange')
  exchangeSso(
    @Body() body: { code: string; appKey: string },
    @Headers('x-grapifly-sso-secret') clientSecret: string | undefined,
  ) {
    return this.auth.exchangeSsoCode(body.code, body.appKey, clientSecret);
  }
}
