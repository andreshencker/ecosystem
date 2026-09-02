import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FLOWS_KEY, type EcosystemFlow } from '../decorators/flows.decorator';
import type { AuthContext } from '../types/auth-context.types';

@Injectable()
export class FlowsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<EcosystemFlow[]>(FLOWS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) return true;
    const ctx = context.switchToHttp().getRequest().authContext as AuthContext | undefined;
    // Machine-to-machine routes keep using their existing token permission checks.
    if (ctx?.actorType === 'apikey') return true;
    if (!ctx?.flow || !allowed.includes(ctx.flow)) {
      throw new ForbiddenException('This route is not available for the current access flow');
    }
    return true;
  }
}
