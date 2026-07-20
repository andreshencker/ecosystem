import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CommunicationPurposesService } from './communication-purposes.service';
import { CreatePurposeDto } from './dto/create-purpose.dto';
import { UpdatePurposeDto } from './dto/update-purpose.dto';
import { PurposeListQueryDto } from './dto/purpose-list-query.dto';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

@ApiTags('Settings — Communication Purposes')
@ApiBearerAuth()
@Controller('settings/communication-purposes')
export class CommunicationPurposesController {
  constructor(private readonly purposes: CommunicationPurposesService) {}

  // ─── Helper ───────────────────────────────────────────────────────────────

  private resolveBusinessId(ctx: AuthContext): string {
    if (!ctx.companyId)
      throw new ForbiddenException('No business assigned to this account');
    return ctx.companyId;
  }

  // ─── Credential options (declared before /:id to avoid route conflict) ────

  @Get('credential-options')
  @HttpCode(200)
  @ApiOperation({ summary: 'List available credential options for a channel' })
  @ApiQuery({ name: 'channel', enum: ['email', 'sms'], required: true })
  async getCredentialOptions(
    @CurrentUser() ctx: AuthContext,
    @Query('channel') channel: 'email' | 'sms',
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.purposes.getCredentialOptions(businessId, channel);
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List Communication Purposes for the authenticated business' })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Query() query: PurposeListQueryDto,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.purposes.list(businessId, query);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new Communication Purpose' })
  async create(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreatePurposeDto,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.purposes.create(businessId, dto);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a Communication Purpose by ID' })
  async findOne(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.purposes.findOne(businessId, id);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a Communication Purpose' })
  async update(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdatePurposeDto,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.purposes.update(businessId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a Communication Purpose' })
  async remove(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.purposes.remove(businessId, id);
  }
}
