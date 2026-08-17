import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service';
export declare class PlatformAdminGuard implements CanActivate {
    private readonly admins;
    constructor(admins: PlatformAdminService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
