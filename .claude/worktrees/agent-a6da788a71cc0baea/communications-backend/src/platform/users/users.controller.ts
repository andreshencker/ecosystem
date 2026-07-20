import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser() ctx: AuthContext): Promise<UserResponseDto> {
    const user = await this.users.findByIdOrThrow(ctx.userId!);
    return UserResponseDto.from(user);
  }

  @Patch('me')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updated = await this.users.update(ctx.userId!, dto);
    return UserResponseDto.from(updated);
  }
}
