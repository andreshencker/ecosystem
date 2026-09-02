import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';
import { AddChannelDto } from './dto/add-channel.dto';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { IndicatorsService } from './indicators.service';

type AuthRequest = Request & { user: AuthContext };

@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly service: IndicatorsService) {}

  @Roles(ApplicationRole.PROVIDER)
  @Get()
  list(@Req() req: AuthRequest) {
    return this.service.listMine(req.user);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateIndicatorDto) {
    return this.service.create(req.user, dto);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Get(':id')
  one(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.findMine(req.user, id);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateIndicatorDto) {
    return this.service.update(req.user, id, dto);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post(':id/webhook/rotate')
  rotateWebhook(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.rotateWebhook(req.user, id);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post(':id/channels')
  addChannel(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: AddChannelDto) {
    return this.service.addChannel(req.user, id, dto);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Delete(':id/channels/:channelId')
  removeChannel(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('channelId') channelId: string,
  ) {
    return this.service.removeChannel(req.user, id, channelId);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Patch(':id/channels/:channelId')
  setChannel(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.service.setChannelEnabled(req.user, id, channelId, dto.enabled);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post(':id/channels/:channelId/rotate')
  rotateChannel(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('channelId') channelId: string,
  ) {
    return this.service.rotateChannelKeys(req.user, id, channelId);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }
}
