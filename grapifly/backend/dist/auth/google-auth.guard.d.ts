import { ExecutionContext } from '@nestjs/common';
declare const GoogleAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class GoogleAuthGuard extends GoogleAuthGuard_base {
    getAuthenticateOptions(context: ExecutionContext): {
        state?: string | undefined;
        prompt: string;
    };
}
export {};
