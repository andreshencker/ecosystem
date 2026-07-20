import { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
export declare class ApiKeyAuthGuard implements CanActivate {
    canActivate(_context: ExecutionContext): boolean;
    tryAuthenticate(_request: Request): Promise<null>;
}
