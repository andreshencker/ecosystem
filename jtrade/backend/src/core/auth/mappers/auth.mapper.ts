import { UserResponseDto } from '../../users/dto/user-response.dto';
import { AuthTokensDto } from '../dto/auth-tokens.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

export class AuthMapper {
  static buildAuthResponse(
    user: UserResponseDto,
    tokens: AuthTokensDto,
  ): AuthResponseDto {
    return {
      user,
      tokens,
    };
  }
}
