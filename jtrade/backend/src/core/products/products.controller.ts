import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';
import { CreateProductDto, CreateProductVersionDto, ReplaceProductVersionFileDto, UpdateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

type AuthRequest = Request & { user: AuthContext };
const uploadInterceptor = FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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
  @Post(':id/media')
  @UseInterceptors(uploadInterceptor)
  uploadMedia(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind?: string,
  ) {
    const resolved = kind === 'cover' ? 'cover' : kind === 'logo' ? 'logo' : null;
    if (!resolved) throw new BadRequestException('kind must be "logo" or "cover"');
    return this.service.setImage(req.user, id, resolved, file);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateProductDto) { return this.service.update(req.user, id, dto); }

  @Roles(ApplicationRole.PROVIDER)
  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) { return this.service.remove(req.user, id); }

  @Roles(ApplicationRole.ADMIN)
  @Patch(':id/review/:status')
  setReviewStatus(@Req() req: AuthRequest, @Param('id') id: string, @Param('status') status: 'published' | 'suspended' | 'draft') {
    return this.service.reviewStatus(id, status, req.user.grapiflyUserId);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Post(':id/versions')
  @UseInterceptors(uploadInterceptor)
  createVersion(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateProductVersionDto,
  ) {
    return this.service.createVersion(req.user, id, file, dto);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Get(':id/versions')
  versions(@Req() req: AuthRequest, @Param('id') id: string) { return this.service.listVersions(req.user, id); }

  @Roles(ApplicationRole.PROVIDER)
  @Put(':id/versions/:versionId/file')
  @UseInterceptors(uploadInterceptor)
  replaceVersionFile(
    @Req() req: AuthRequest,
    @Param('versionId') versionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ReplaceProductVersionFileDto,
  ) {
    return this.service.replaceVersionFile(req.user, versionId, file, dto);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Patch(':id/versions/:versionId/current')
  markCurrentVersion(@Req() req: AuthRequest, @Param('versionId') versionId: string) {
    return this.service.markCurrentVersion(req.user, versionId);
  }

  @Roles(ApplicationRole.PROVIDER)
  @Get(':id/versions/:versionId/download')
  downloadVersion(
    @Req() req: AuthRequest,
    @Param('versionId') versionId: string,
    @Query('expiresInSeconds') expiresInSeconds?: string,
  ) {
    const parsed = expiresInSeconds ? Number(expiresInSeconds) : undefined;
    return this.service.downloadVersion(req.user, versionId, Number.isFinite(parsed) ? parsed : undefined);
  }
}
