import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';
import { ProductPricingService } from './product-pricing.service';

type AuthRequest = Request & { user: AuthContext };

/**
 * Organization-wide pricing view. Kept on its own path so it does not collide
 * with the product-scoped routes in ProductPricingController (`products/:productId/...`).
 */
@Controller('pricing')
export class PricingOverviewController {
  constructor(private readonly service: ProductPricingService) {}

  @Roles(ApplicationRole.PROVIDER)
  @Get()
  overview(@Req() req: AuthRequest) {
    return this.service.overview(req.user);
  }
}
