import { AuthService } from './auth.service';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<import("./dto/auth-response.dto").AuthResponseDto>;
    refresh(dto: RefreshTokenDto): Promise<import("./dto/auth-response.dto").TokensOnlyDto>;
    logout(dto: RefreshTokenDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    me(ctx: AuthContext): {
        actorType: "user" | "apikey";
        userId: string | undefined;
    };
}
