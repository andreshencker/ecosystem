import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, SessionRequest } from '../auth/session.guard';
import { CommunicationTokensService } from './communication-tokens.service';
import { CreateCommunicationTokenDto } from './dto/create-communication-token.dto';

@Controller('organizations/:organizationId/communication-tokens')
@UseGuards(SessionGuard)
export class CommunicationTokensController {
  constructor(private readonly tokens: CommunicationTokensService) {}

  @Get()
  async list(@Req() request: SessionRequest, @Param('organizationId') organizationId: string) {
    const tokens = await this.tokens.listForOrganization(request.grapiflySession!.sub, organizationId);
    return { tokens, total: tokens.length };
  }

  @Post()
  create(@Req() request: SessionRequest, @Param('organizationId') organizationId: string, @Body() body: CreateCommunicationTokenDto) {
    return this.tokens.createForOrganization(request.grapiflySession!.sub, organizationId, body);
  }

  @Post(':tokenId/revoke')
  revoke(@Req() request: SessionRequest, @Param('organizationId') organizationId: string, @Param('tokenId') tokenId: string) {
    return this.tokens.revoke(request.grapiflySession!.sub, organizationId, tokenId);
  }

  @Delete(':tokenId')
  remove(@Req() request: SessionRequest, @Param('organizationId') organizationId: string, @Param('tokenId') tokenId: string) {
    return this.tokens.remove(request.grapiflySession!.sub, organizationId, tokenId);
  }
}
