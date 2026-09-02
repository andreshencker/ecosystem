import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsMongoId } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';
import { OrdersService } from './orders.service';

type AuthRequest = Request & { user: AuthContext };

class CheckoutDto {
  @IsMongoId() productId!: string;
  @IsMongoId() pricingId!: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Roles(ApplicationRole.CLIENT)
  @Post()
  checkout(@Req() req: AuthRequest, @Body() dto: CheckoutDto) {
    return this.service.checkout(req.user, dto.productId, dto.pricingId);
  }

  @Roles(ApplicationRole.CLIENT)
  @Get('mine')
  mine(@Req() req: AuthRequest) {
    return this.service.listMine(req.user);
  }

  @Roles(ApplicationRole.CLIENT)
  @Post(':id/cancel')
  cancel(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.cancel(req.user, id);
  }

  /** Provider — sales for the current organization. */
  @Roles(ApplicationRole.PROVIDER)
  @Get()
  sales(@Req() req: AuthRequest) {
    return this.service.listSales(req.user);
  }
}
