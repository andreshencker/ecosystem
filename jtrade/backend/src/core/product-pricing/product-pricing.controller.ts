import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';
import { CreateProductPricingDto, UpdateProductPricingDto } from './dto/pricing.dto';
import { ProductPricingService } from './product-pricing.service';

type AuthRequest = Request & { user: AuthContext };

@Controller('products/:productId/pricing')
export class ProductPricingController {
  constructor(private readonly service: ProductPricingService) {}

  @Roles(ApplicationRole.PROVIDER, ApplicationRole.CLIENT, ApplicationRole.ADMIN)
  @Get()
  list(@Req() req: AuthRequest, @Param('productId') productId: string) {
    return this.service.list(req.user, productId);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post()
  create(@Req() req: AuthRequest, @Param('productId') productId: string, @Body() dto: CreateProductPricingDto) {
    return this.service.create(req.user, productId, dto);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Patch(':pricingId')
  update(
    @Req() req: AuthRequest,
    @Param('productId') productId: string,
    @Param('pricingId') pricingId: string,
    @Body() dto: UpdateProductPricingDto,
  ) {
    return this.service.update(req.user, productId, pricingId, dto);
  }

  /** Pricing used by an order is historical business data, so deletion means deactivation. */
  @Roles(ApplicationRole.PROVIDER)
  @Delete(':pricingId')
  deactivate(@Req() req: AuthRequest, @Param('productId') productId: string, @Param('pricingId') pricingId: string) {
    return this.service.deactivate(req.user, productId, pricingId);
  }
}
