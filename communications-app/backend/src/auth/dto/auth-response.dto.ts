import { EcosystemUserResponseDto } from '../../ecosystem/identity/dto/ecosystem-user-response.dto';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  /** Access token TTL in seconds. */
  expiresIn!: number;
  user!: EcosystemUserResponseDto;
}

export class TokensOnlyDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}
