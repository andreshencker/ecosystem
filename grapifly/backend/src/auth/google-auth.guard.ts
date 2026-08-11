import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const app = request.query.app === 'relay' ? 'relay' : undefined;

    return {
      prompt: 'select_account',
      ...(app ? { state: app } : {}),
    };
  }
}
