import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CommunicationConnectionService } from './communication-connection.service';
import {
  SaveConnectionDto,
  TestConnectionDto,
  ToggleConnectionDto,
} from './dto/communication-connection.dto';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

const PROVIDER = 'communications';

@ApiTags('Settings — Communications')
@ApiBearerAuth()
@Controller('settings/communications')
export class CommunicationConnectionController {
  constructor(private readonly service: CommunicationConnectionService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get the Communications connection for the authenticated business',
  })
  async get(@CurrentUser() ctx: AuthContext) {
    const result = await this.service.get(this.uid(ctx), PROVIDER);
    if (!result)
      throw new NotFoundException('No Communications connection configured.');
    return result;
  }

  @Put()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Save or replace the Communications integration token',
  })
  async save(@CurrentUser() ctx: AuthContext, @Body() dto: SaveConnectionDto) {
    return this.service.save(this.uid(ctx), PROVIDER, dto.token, dto.isActive);
  }

  @Post('test')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Test a token. If token provided: test without saving. Otherwise: test stored token.',
  })
  async test(@CurrentUser() ctx: AuthContext, @Body() dto: TestConnectionDto) {
    return this.service.test(this.uid(ctx), PROVIDER, dto.token);
  }

  @Patch()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Toggle active/inactive without changing the token',
  })
  async toggle(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: ToggleConnectionDto,
  ) {
    return this.service.toggle(this.uid(ctx), PROVIDER, dto.isActive);
  }

  @Delete()
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete the Communications connection permanently' })
  async remove(@CurrentUser() ctx: AuthContext) {
    return this.service.delete(this.uid(ctx), PROVIDER);
  }

  // JWT only carries sub+type — businessId resolved from DB in the service.
  private uid(ctx: AuthContext | undefined): string {
    if (!ctx?.userId) throw new ForbiddenException('Authentication required.');
    return ctx.userId;
  }
}
