import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { GrapiflyTeamService } from '../services/grapifly-team.service';

@Controller('team')
export class EcosystemTeamController {
  constructor(private readonly team: GrapiflyTeamService) {}
  @Get() list(@CurrentUser() ctx: AuthContext) { return this.team.list(ctx); }
  @Post('invitations') invite(@CurrentUser() ctx: AuthContext, @Body() body: { email: string; role: string }) { return this.team.invite(ctx, body); }
  @Post('invitations/:id/regenerate') regenerate(@CurrentUser() ctx: AuthContext, @Param('id') id: string) { return this.team.regenerate(ctx, id); }
  @Post('invitations/:id/cancel') cancel(@CurrentUser() ctx: AuthContext, @Param('id') id: string) { return this.team.cancel(ctx, id); }
  @Patch('members/:id') update(@CurrentUser() ctx: AuthContext, @Param('id') id: string, @Body() body: { role?: string; status?: string }) { return this.team.updateMember(ctx, id, body); }
}
