import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    // Any non-empty appKey is accepted here — the real validation (does this
    // app exist and is it active in the catalogue) happens downstream at
    // createSsoCode(), before a code is ever minted for it.
    const app = typeof request.query.app === 'string' && request.query.app.trim() ? request.query.app.trim() : undefined;
    const invitation = request.query.flow === 'invitation';

    return {
      prompt: 'select_account',
      ...(app ? { state: app } : invitation ? { state: 'invitation' } : {}),
    };
  }
}
