import { Body, Controller, Get, Headers, HttpException, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
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
    const identity = request.user as GoogleIdentity;

    // Determine what `tipo` a brand-new identity should get. Existing
    // identities ignore this entirely (loginWithGoogle only consults it via
    // $setOnInsert), so 'client' is just an inert default for that case.
    let requestedType: 'client' | 'provider' = 'client';

    if (request.query.state && request.query.state !== 'invitation') {
      const appKey = String(request.query.state);
      const organizationId = request.cookies?.grapifly_sso_organization as string | undefined;

      const existingUser = await this.auth.findByProviderSubject('google', identity.subject);
      if (!existingUser) {
        const application = await this.auth.assertActiveApplication(appKey);
        const selectableFlows = (application.allowedFlows ?? []).filter((flow) => flow !== 'internal');
        if (selectableFlows.length > 1) {
          // New identity, and this app offers more than one self-service
          // flow — park the Google identity and let the person choose on
          // Grapifly's own account-type screen instead of guessing.
          response.clearCookie('grapifly_sso_organization', { path: '/' });
          const pendingToken = await this.auth.createPendingSignup(identity, appKey, organizationId);
          response.cookie('grapifly_pending_signup', pendingToken, {
            httpOnly: true,
            secure: this.config.get<string>('NODE_ENV') === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000,
            path: '/',
          });
          const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100';
          return response.redirect(`${frontendUrl.replace(/\/$/, '')}/choose-account-type?app=${encodeURIComponent(appKey)}`);
        }
        requestedType = (selectableFlows[0] as 'client' | 'provider' | undefined) ?? 'client';
      }
    }

    const { user, sessionToken, wasNew, organizationId: defaultOrganizationId } = await this.auth.loginWithGoogle(
      identity,
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

  /**
   * Finishes a signup that was parked by googleCallback() because the app
   * offers more than one self-service flow — the person just picked one on
   * Grapifly's /choose-account-type screen.
   */
  @Get('complete-signup')
  async completeSignup(
    @Query('type') type: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100';
    const token = request.cookies?.grapifly_pending_signup as string | undefined;
    response.clearCookie('grapifly_pending_signup', { path: '/' });

    const pending = token ? await this.auth.consumePendingSignup(token) : null;
    if (!pending) {
      const appFallback = typeof request.query.app === 'string' ? request.query.app : '';
      return response.redirect(`${frontendUrl.replace(/\/$/, '')}/choose-account-type?app=${encodeURIComponent(appFallback)}&error=expired`);
    }

    const application = await this.auth.assertActiveApplication(pending.appKey);
    const selectableFlows = (application.allowedFlows ?? []).filter((flow) => flow !== 'internal');
    const requestedType = type === 'provider' ? 'provider' : 'client';
    if (!selectableFlows.includes(requestedType)) {
      return response.redirect(`${frontendUrl.replace(/\/$/, '')}/choose-account-type?app=${encodeURIComponent(pending.appKey)}&error=invalid_type`);
    }

    const { user, sessionToken, wasNew, organizationId: defaultOrganizationId } = await this.auth.loginWithGoogle(
      {
        subject: pending.providerSubject,
        email: pending.email,
        emailVerified: pending.emailVerified,
        displayName: pending.displayName,
        avatarUrl: pending.avatarUrl,
      },
      requestedType,
    );
    if (wasNew && requestedType === 'provider') {
      await this.auth.grantProviderSignup(user.grapiflyUserId, defaultOrganizationId, pending.appKey).catch(() => {});
    }
    response.cookie('grapifly_session', sessionToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return response.redirect(`/auth/sso/${encodeURIComponent(pending.appKey)}${pending.organizationId ? `?organizationId=${encodeURIComponent(pending.organizationId)}` : ''}`);
  }

  @Post('sso/exchange')
  exchangeSso(
    @Body() body: { code: string; appKey: string },
    @Headers('x-grapifly-sso-secret') clientSecret: string | undefined,
  ) {
    return this.auth.exchangeSsoCode(body.code, body.appKey, clientSecret);
  }
}
