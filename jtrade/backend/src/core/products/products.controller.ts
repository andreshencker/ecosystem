import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';
import { CreateProductDto, CreateProductVersionDto, UpdateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

type AuthRequest = Request & { user: AuthContext };

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Roles(ApplicationRole.PROVIDER)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateProductDto) { return this.service.create(req.user, dto); }

  @Roles(ApplicationRole.PROVIDER)
  @Get('mine')
  mine(@Req() req: AuthRequest) { return this.service.listMine(req.user); }

  @Roles(ApplicationRole.CLIENT, ApplicationRole.PROVIDER, ApplicationRole.ADMIN)
  @Get('marketplace')
  marketplace() { return this.service.listPublished(); }

  @Roles(ApplicationRole.ADMIN)
  @Get('review')
  review() { return this.service.listAllForInternal(); }

  @Roles(ApplicationRole.PROVIDER)
  @Get(':id')
  one(@Req() req: AuthRequest, @Param('id') id: string) { return this.service.findMine(req.user, id); }

  @Roles(ApplicationRole.PROVIDER)
  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateProductDto) { return this.service.update(req.user, id, dto); }

  @Roles(ApplicationRole.ADMIN)
  @Patch(':id/review/:status')
  setReviewStatus(@Req() req: AuthRequest, @Param('id') id: string, @Param('status') status: 'published' | 'suspended' | 'draft') {
    return this.service.reviewStatus(id, status, req.user.grapiflyUserId);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post(':id/versions')
  version(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: Omit<CreateProductVersionDto, 'productId'>) {
    return this.service.createVersion(req.user, { ...dto, productId: id });
  }

  @Roles(ApplicationRole.PROVIDER)
  @Get(':id/versions')
  versions(@Req() req: AuthRequest, @Param('id') id: string) { return this.service.listVersions(req.user, id); }
}
