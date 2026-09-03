import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import {
  ApplicationRole,
  type AuthContext,
} from '../../core/auth/types/auth-context';
import { StartMethodDto } from './dto/payments-onboarding.dto';
import { PaymentsOnboardingService } from './payments-onboarding.service';

type AuthRequest = Request & { user: AuthContext };

/**
 * Provider-facing. The organization always comes from the JWT, never the body.
 * jtrade owns every rule here; Relay is only the payment window underneath.
 */
@Controller('onboarding/payments')
export class PaymentsOnboardingController {
  constructor(private readonly service: PaymentsOnboardingService) {}

  @Roles(ApplicationRole.PROVIDER)
  @Get()
  status(@Req() req: AuthRequest) {
    return this.service.getStatus(req.user.organizationId);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post('methods/:method/start')
  start(
    @Req() req: AuthRequest,
    @Param('method') method: string,
    @Body() dto: StartMethodDto,
  ) {
    return this.service.startMethod(
      req.user.organizationId,
      method.toLowerCase(),
      dto,
    );
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post('methods/:method/refresh')
  refresh(@Req() req: AuthRequest, @Param('method') method: string) {
    return this.service.refreshMethod(
      req.user.organizationId,
      method.toLowerCase(),
    );
  }
}
