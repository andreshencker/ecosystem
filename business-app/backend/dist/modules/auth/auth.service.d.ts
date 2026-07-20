import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { RefreshTokenDocument } from './schemas/refresh-token.schema';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
import { ProvisioningService } from '../provisioning/provisioning.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, TokensOnlyDto } from './dto/auth-response.dto';
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    private readonly config;
    private readonly commClient;
    private readonly provisioning;
    private readonly tokenModel;
    private readonly logger;
    constructor(users: UsersService, jwt: JwtService, config: ConfigService, commClient: CommunicationsClientService, provisioning: ProvisioningService, tokenModel: Model<RefreshTokenDocument>);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    verifyEmail(rawToken: string): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<AuthResponseDto>;
    refreshTokens(rawRefreshToken: string): Promise<TokensOnlyDto>;
    logout(rawRefreshToken: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(rawToken: string, newPassword: string): Promise<{
        message: string;
    }>;
    private issueTokens;
    private revokeAllTokensForUser;
    private sha256;
    private buildUrl;
    private accessTokenExpiresInSeconds;
    private refreshTokenExpiresAt;
    private parseDurationToSeconds;
}
