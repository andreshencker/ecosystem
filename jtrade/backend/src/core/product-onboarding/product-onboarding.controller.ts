import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';
import { UpdateOnboardingProgressDto } from './dto/onboarding.dto';
import { ProductOnboardingService } from './product-onboarding.service';

type AuthRequest = Request & { user: AuthContext };

/**
 * Commercial Product Onboarding — provider-facing wizard support.
 * Data still flows through /products and /products/:id/pricing; this only adds
 * the readiness + progress aggregate the wizard shell needs.
 */
@Controller('products/:productId/onboarding')
export class ProductOnboardingController {
  constructor(private readonly service: ProductOnboardingService) {}

  @Roles(ApplicationRole.PROVIDER)
  @Get()
  get(@Req() req: AuthRequest, @Param('productId') productId: string) {
    return this.service.getOnboarding(req.user, productId);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Patch('progress')
  progress(
    @Req() req: AuthRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateOnboardingProgressDto,
  ) {
    return this.service.saveProgress(req.user, productId, dto);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post('complete')
  complete(@Req() req: AuthRequest, @Param('productId') productId: string) {
    return this.service.complete(req.user, productId);
  }
}
