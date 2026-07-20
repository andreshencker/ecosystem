import { AuthTokensDto } from './auth-tokens.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  user: UserResponseDto;
  tokens: AuthTokensDto;
}
