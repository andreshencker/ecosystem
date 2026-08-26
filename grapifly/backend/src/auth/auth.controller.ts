import { Body, Controller, Get, Headers, HttpException, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
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
    const requestedType = request.cookies?.grapifly_signup_type === 'provider' ? 'provider' : 'client';
    response.clearCookie('grapifly_signup_type', { path: '/' });
    const { user, sessionToken, wasNew, organizationId: defaultOrganizationId } = await this.auth.loginWithGoogle(
      request.user as GoogleIdentity,
      requestedType,
    );
    response.cookie('grapifly_session', sessionToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    if (request.query.state && request.query.state !== 'invitation') {
      const appKey = String(request.query.state);
      // A brand-new provider signup grants the specific app they registered
      // through — grantDefaultAccess() only covers autoGrantOnSignup apps,
      // which isn't the same thing as "the app the person just signed up for".
      if (wasNew && requestedType === 'provider') {
        await this.auth.grantProviderSignup(user.grapiflyUserId, defaultOrganizationId, appKey).catch(() => {});
      }
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
   * Ends the shared Grapifly session when signing out from a catalogue app,
   * then returns the browser to that app's public sign-in page.
   */
  @Get('logout/application/:appKey')
  async logoutFromApplication(
    @Param('appKey') appKey: string,
    @Res() response: Response,
  ) {
    const application = await this.auth.assertActiveApplication(appKey);
    response.clearCookie('grapifly_session', { path: '/' });
    return response.redirect(
      `${application.launchUrl.replace(/\/$/, '')}/signin?signedOut=true`,
    );
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

    if (request.query.flow && !['client', 'provider'].includes(String(request.query.flow))) {
      throw new HttpException('Public sign-in only supports client or provider', 400);
    }
    const requestedType = request.query.flow === 'provider' ? 'provider' : 'client';
    if (requestedType === 'provider' && !application.allowedFlows?.includes('provider')) {
      throw new HttpException(`${appKey} does not support the provider flow`, 400);
    }

    const token = request.cookies?.grapifly_session as string | undefined;
    const session = await this.auth.resolveSession(token);
    if (!session) {
      response.cookie('grapifly_signup_type', requestedType, {
        httpOnly: true,
        secure: this.config.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
        path: '/',
      });
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

    const callback = application.ssoCallbackUrl ?? 'http://localhost:3000/auth/grapifly/callback';
    const organizationId = typeof request.query.organizationId === 'string' ? request.query.organizationId : undefined;
    try {
      const code = await this.auth.createSsoCode(appKey, session.sub, organizationId);
      return response.redirect(`${callback}?code=${encodeURIComponent(code)}`);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 403) {
        const separator = callback.includes('?') ? '&' : '?';
        return response.redirect(`${callback}${separator}error=access_required`);
      }
      throw error;
    }
  }

  @Post('sso/exchange')
  exchangeSso(
    @Body() body: { code: string; appKey: string },
    @Headers('x-grapifly-sso-secret') clientSecret: string | undefined,
  ) {
    return this.auth.exchangeSsoCode(body.code, body.appKey, clientSecret);
  }
}
