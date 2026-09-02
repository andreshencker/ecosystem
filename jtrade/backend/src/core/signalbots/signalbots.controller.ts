import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';
import {
  CreateSignalbotDto, ExecutionDto, UpdateExecutionDto, UpdateSignalbotDto,
} from './dto/signalbot.dto';
import { SignalbotsService } from './signalbots.service';

type AuthRequest = Request & { user: AuthContext };

@Controller('signalbots')
export class SignalbotsController {
  constructor(private readonly service: SignalbotsService) {}

  @Roles(ApplicationRole.CLIENT)
  @Get()
  list(@Req() req: AuthRequest) {
    return this.service.listMine(req.user);
  }

  @Roles(ApplicationRole.CLIENT)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateSignalbotDto) {
    return this.service.create(req.user, dto);
  }

  @Roles(ApplicationRole.CLIENT)
  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateSignalbotDto) {
    return this.service.update(req.user, id, dto);
  }

  @Roles(ApplicationRole.CLIENT)
  @Post(':id/token/rotate')
  rotateToken(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.rotateToken(req.user, id);
  }

  @Roles(ApplicationRole.CLIENT)
  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }

  @Roles(ApplicationRole.CLIENT)
  @Get('products/:productId/channels')
  productChannels(@Req() req: AuthRequest, @Param('productId') productId: string) {
    return this.service.productChannels(req.user, productId);
  }

  @Roles(ApplicationRole.CLIENT)
  @Get(':id/available-channels')
  availableChannels(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.availableChannels(req.user, id);
  }

  @Roles(ApplicationRole.CLIENT)
  @Post(':id/executions')
  addExecution(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: ExecutionDto) {
    return this.service.addExecution(req.user, id, dto);
  }

  @Roles(ApplicationRole.CLIENT)
  @Patch(':id/executions/:channelId')
  updateExecution(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateExecutionDto,
  ) {
    return this.service.updateExecution(req.user, id, channelId, dto);
  }

  @Roles(ApplicationRole.CLIENT)
  @Delete(':id/executions/:channelId')
  removeExecution(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('channelId') channelId: string,
  ) {
    return this.service.removeExecution(req.user, id, channelId);
  }
}
