import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? 'configure-google-client-id',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? 'configure-google-client-secret',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') ?? 'http://localhost:3101/auth/google/callback',
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
