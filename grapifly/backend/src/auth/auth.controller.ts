import { Body, Controller, Get, Headers, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
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

  @Get('google/invitation/:token')
  continueInvitation(
    @Param('token') token: string,
    @Res() response: Response,
  ) {
    response.cookie('grapifly_invitation_token', token, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/',
    });
    return response.redirect('/auth/google?flow=invitation');
  }

  /** Same "sign in then continue" pattern as continueInvitation(), for the separate ecosystem-admin invitation flow. */
  @Get('google/admin-invitation/:token')
  continueAdminInvitation(
    @Param('token') token: string,
    @Res() response: Response,
  ) {
    response.cookie('grapifly_admin_invitation_token', token, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/',
    });
    return response.redirect('/auth/google?flow=invitation');
  }

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
    if (request.query.state && request.query.state !== 'invitation') {
      const appKey = String(request.query.state);
      const organizationId = request.cookies?.grapifly_sso_organization as string | undefined;
      response.clearCookie('grapifly_sso_organization', { path: '/' });
      return response.redirect(`/auth/sso/${encodeURIComponent(appKey)}${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''}`);
    }

    if (request.query.state === 'invitation') {
      const frontendUrl =
        this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100';

      const adminInvitationToken = request.cookies
        ?.grapifly_admin_invitation_token as string | undefined;
      response.clearCookie('grapifly_admin_invitation_token', { path: '/' });
      if (adminInvitationToken) {
        return response.redirect(
          `${frontendUrl.replace(/\/$/, '')}/admin-invitations/${encodeURIComponent(adminInvitationToken)}`,
        );
      }

      const invitationToken = request.cookies?.grapifly_invitation_token as
        | string
        | undefined;
      response.clearCookie('grapifly_invitation_token', { path: '/' });
      if (invitationToken) {
        return response.redirect(
          `${frontendUrl.replace(/\/$/, '')}/invitations/${encodeURIComponent(invitationToken)}`,
        );
      }
    }

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

  /**
   * Generic SSO entry point for any app registered in the Applications
   * catalogue — NestJS routing matches /auth/sso/relay exactly the same as
   * before, so Relay's existing frontend link needs no changes.
   */
  @Get('sso/:appKey')
  async ssoRedirect(
    @Param('appKey') appKey: string,
    @Req() request: SessionRequest,
    @Res() response: Response,
  ) {
    // Fail fast — validated before touching Google, so an unknown/typo'd
    // appKey never burns a full OAuth round trip to discover.
    const application = await this.auth.assertActiveApplication(appKey);

    const token = request.cookies?.grapifly_session as string | undefined;
    const session = await this.auth.resolveSession(token);
    if (!session) {
      const organizationId = typeof request.query.organizationId === 'string' ? request.query.organizationId : undefined;
      if (organizationId) {
        response.cookie('grapifly_sso_organization', organizationId, {
          httpOnly: true,
          secure: this.config.get<string>('NODE_ENV') === 'production',
          sameSite: 'lax',
          maxAge: 5 * 60 * 1000,
          path: '/',
        });
      }
      return response.redirect(`/auth/google?app=${encodeURIComponent(appKey)}`);
    }

    const organizationId = typeof request.query.organizationId === 'string' ? request.query.organizationId : undefined;
    const code = await this.auth.createSsoCode(appKey, session.sub, organizationId);
    const callback = application.ssoCallbackUrl ?? 'http://localhost:3000/auth/grapifly/callback';
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
