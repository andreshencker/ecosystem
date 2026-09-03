import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

export interface GoogleStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  // clientID / clientSecret are resolved (Relay first, env fallback) by the
  // async factory provider in AuthModule — see relay-google-credentials.service.
  constructor(options: GoogleStrategyOptions) {
    super({
      clientID: options.clientID,
      clientSecret: options.clientSecret,
      callbackURL: options.callbackURL,
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: (error: unknown, user?: unknown) => void) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Google account did not provide an email address'));
    done(null, {
      subject: profile.id,
      email,
      emailVerified: true,
      displayName: profile.displayName || email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value ?? null,
    });
  }
}
