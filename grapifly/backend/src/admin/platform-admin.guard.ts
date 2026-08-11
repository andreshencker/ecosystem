import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SessionRequest } from '../auth/session.guard';
import { PlatformAdminService } from './platform-admin.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly admins: PlatformAdminService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    await this.admins.requireActiveAdmin(request.grapiflySession!.sub);
    return true;
  }
}
