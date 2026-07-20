import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import type { Request } from 'express';

import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CodeProjectVersionsService } from './code-project-versions.service';
import { CreateCodeProjectVersionDto } from './dto/create-code-project-version.dto';
import { UpdateCodeProjectVersionDto } from './dto/update-code-project-version.dto';
import { ReplaceCodeProjectVersionFileDto } from './dto/replace-code-project-version-file.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Code Project Versions')
@Controller('code-project-versions')
export class CodeProjectVersionsController {
  constructor(private readonly service: CodeProjectVersionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get('my')
  @HttpCode(200)
  @ApiOperation({ summary: 'List my code project versions' })
  findMyVersions(
    @Req() req: Request,
    @Query('projectCodePlatformId') projectCodePlatformId?: string,
    @Query('codeProjectId') codeProjectId?: string,
    @Query('platformId') platformId?: string,
    @Query('active') active?: string,
    @Query('current') current?: string,
  ) {
    const userId = (req as any).user.sub;

    return this.service.findMyVersions(userId, {
      projectCodePlatformId,
      codeProjectId,
      platformId,
      active: this.toBool(active),
      current: this.toBool(current),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get('my/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get my code project version by id' })
  findMyVersionById(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.sub;
    return this.service.findMyVersionById(userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Post('my/upload')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create my code project version with file upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCodeProjectVersionDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  createMyWithFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateCodeProjectVersionDto,
  ) {
    const userId = (req as any).user.sub;
    const authHeader = req.headers.authorization;

    return this.service.createMyWithFile(userId, file, dto, authHeader);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Put('my/:id/file')
  @HttpCode(200)
  @ApiOperation({ summary: 'Replace my stored file for an existing version' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ReplaceCodeProjectVersionFileDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  replaceMyFile(
    @Req() req: Request,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ReplaceCodeProjectVersionFileDto,
  ) {
    const userId = (req as any).user.sub;
    const authHeader = req.headers.authorization;

    return this.service.replaceMyFile(userId, id, file, dto, authHeader);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Patch('my/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update my code project version metadata' })
  @ApiBody({ type: UpdateCodeProjectVersionDto })
  updateMy(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCodeProjectVersionDto,
  ) {
    const userId = (req as any).user.sub;
    return this.service.updateMy(userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Delete('my/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete my code project version' })
  removeMy(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.sub;
    return this.service.removeMy(userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin list code project versions' })
  findAll(
    @Query('projectCodePlatformId') projectCodePlatformId?: string,
    @Query('codeProjectId') codeProjectId?: string,
    @Query('companyProviderId') companyProviderId?: string,
    @Query('platformId') platformId?: string,
    @Query('active') active?: string,
    @Query('current') current?: string,
    @Query('populate') populate?: string,
  ) {
    return this.service.findAll({
      projectCodePlatformId,
      codeProjectId,
      companyProviderId,
      platformId,
      active: this.toBool(active),
      current: this.toBool(current),
      populate: this.toBool(populate) ?? true,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CLIENT)
  @Get('download/current/:projectCodePlatformId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get signed download URL for current version by project platform',
  })
  downloadCurrentByProjectCodePlatform(
    @Req() req: Request,
    @Param('projectCodePlatformId') projectCodePlatformId: string,
    @Query('expiresInSeconds') expiresInSeconds?: string,
  ) {
    const authHeader = req.headers.authorization;

    const expires =
      expiresInSeconds && Number.isFinite(Number(expiresInSeconds))
        ? Number(expiresInSeconds)
        : 60;

    return this.service.downloadCurrentByProjectCodePlatform(
      projectCodePlatformId,
      expires,
      authHeader,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  @Get(':id/download')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get signed download URL for a specific version by id',
  })
  downloadById(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('expiresInSeconds') expiresInSeconds?: string,
  ) {
    const authHeader = req.headers.authorization;

    const expires =
      expiresInSeconds && Number.isFinite(Number(expiresInSeconds))
        ? Number(expiresInSeconds)
        : 60;

    return this.service.downloadById(id, expires, authHeader);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin get version by id' })
  findById(@Param('id') id: string, @Query('populate') populate?: string) {
    return this.service.findById(id, this.toBool(populate) ?? true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin delete code project version' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  private toBool(v?: string): boolean | undefined {
    if (typeof v !== 'string') return undefined;

    const s = v.toLowerCase().trim();

    return s === 'true' || s === '1';
  }
}
