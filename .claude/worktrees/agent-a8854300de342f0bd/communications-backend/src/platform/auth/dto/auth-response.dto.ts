import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  /** Access token TTL in seconds. */
  expiresIn!: number;
  user!: UserResponseDto;
}

export class TokensOnlyDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}
