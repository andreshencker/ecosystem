// src/company-info/company.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePagination } from '../../common/pagination/pagination.util';

import { CompanyService } from './company.service';
import { CreateCompanyMultipartDto } from './dto/create-company-multipart.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

import { MediaService } from '../../../files/media/services/media.service';
import { EcosystemIdentityService } from '../../../ecosystem/identity/ecosystem-identity.service';
import { CompanyProvisioningService } from '../provisioning/company-provisioning.service';
import { CompanyDeletionService } from './company-deletion.service';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  private readonly logger = new Logger(CompanyController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly companies: CompanyService,
    private readonly deletion: CompanyDeletionService,
    private readonly media: MediaService,
    private readonly identity: EcosystemIdentityService,
    private readonly provisioning: CompanyProvisioningService,
  ) {}

  // ==========================
  // Helpers

  // ==========================
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List companies' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max records (1–200, default 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Records to skip (default 0)',
  })
  async list(
    @Headers('x-api-key') apiKey: string,
    @CurrentUser() ctx: AuthContext | undefined,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertAccess(apiKey, ctx);
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );
    return this.companies.findAll({
      active: this.toBool(active),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get('by-key/:companyKey')
  @HttpCode(200)
  async getByKey(
    @Headers('x-api-key') apiKey: string,
    @CurrentUser() ctx: AuthContext | undefined,
    @Param('companyKey') companyKey: string,
  ) {
    this.assertAccess(apiKey, ctx);
    return this.companies.findByKey(companyKey);
  }

  @Get(':companyId')
  @HttpCode(200)
  async getById(
    @Headers('x-api-key') apiKey: string,
    @CurrentUser() ctx: AuthContext | undefined,
    @Param('companyId') companyId: string,
  ) {
    this.assertAccess(apiKey, ctx);
    return this.companies.findById(companyId);
  }

  // ==========================
  // READ

  // ==========================
  @Post('json')
  @HttpCode(201)
  async createJson(
    @Headers('x-api-key') apiKey: string,
    @CurrentUser() ctx: AuthContext | undefined,
    @Body() dto: CreateCompanyDto,
  ) {
    this.assertAccess(apiKey, ctx);
    const created = await this.companies.create(dto);
    // Tenant provisioning — theme + layouts only (no domains or events for tenants).
    this.provisioning
      .provisionCompany(String(created.id))
      .catch((err) =>
        this.logger.error(
          `Auto-provisioning failed for ${created.id}: ${err?.message}`,
        ),
      );
    return created;
  }

  // ==========================
  @Post()
  @HttpCode(201)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logoIconFile', maxCount: 1 },
      { name: 'logoFullFile', maxCount: 1 },
    ]),
  )
  async createMultipart(
    @Headers('x-api-key') apiKey: string,
    @CurrentUser() ctx: AuthContext | undefined,
    @Body() dto: CreateCompanyMultipartDto,
    @UploadedFiles()
    files?: {
      logoIconFile?: Express.Multer.File[];
      logoFullFile?: Express.Multer.File[];
    },
  ) {
    this.assertAccess(apiKey, ctx);

    // 1) Crear company (guarda URLs directas si vinieron)
    const created = await this.companies.create({
      companyKey: dto.companyKey,
      displayName: dto.displayName,
      legalName: dto.legalName,
      tagline: dto.tagline,
      timezone: dto.timezone,
      isActive: this.toBool(dto.isActive),
      logoIconUrl: this.cleanUrl(dto.logoIconUrl),
      logoFullUrl: this.cleanUrl(dto.logoFullUrl),
    } as any);

    const companyId = created.id;

    // 2) Si vienen files, subimos a storage usando MediaService (alineado con runtime+factory)
    const logoIcon = files?.logoIconFile?.[0];
    const logoFull = files?.logoFullFile?.[0];

    const updates: Partial<UpdateCompanyDto> = {};

    if (logoIcon) {
      const uploaded = await this.media.upload(logoIcon, {
        companyId,
        domain: 'company',
        kind: 'logo-icon',
        entityId: companyId,
        public: true,
        folder: 'branding',
      } as any);

      updates.logoIconUrl = uploaded.url as any;
    }

    if (logoFull) {
      const uploaded = await this.media.upload(logoFull, {
        companyId,
        domain: 'company',
        kind: 'logo-full',
        entityId: companyId,
        public: true,
        folder: 'branding',
      } as any);

      updates.logoFullUrl = uploaded.url as any;
    }

    // 3) Persist logo URLs if uploaded
    let result = created;
    if (Object.keys(updates).length) {
      result = await this.companies.updateById(companyId, updates as any);
    }

    // Tenant provisioning — theme + layouts only (no domains or events for tenants).
    this.provisioning
      .provisionCompany(companyId)
      .catch((err) =>
        this.logger.error(
          `Auto-provisioning failed for ${companyId}: ${err?.message}`,
        ),
      );

    return result;
  }

  // ==========================
  @Patch(':companyKey')
  @HttpCode(200)
  async updateByKey(
    @Headers('x-api-key') apiKey: string,
    @CurrentUser() ctx: AuthContext | undefined,
    @Param('companyKey') companyKey: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    this.assertAccess(apiKey, ctx);
    return this.companies.updateByKey(companyKey, dto);
  }

  // ==========================
  // CREATE (JSON) — opcional (por si aún lo usas)

  // ==========================
  @Delete(':companyKey')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delete a company and all its associated data (cascade)',
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description:
      'Preview what would be deleted without actually deleting anything',
  })
  async removeByKey(
    @Headers('x-api-key') apiKey: string,
    @CurrentUser() ctx: AuthContext | undefined,
    @Param('companyKey') companyKey: string,
    @Query('dryRun') dryRun?: string,
  ) {
    this.assertAccess(apiKey, ctx);
    return this.deletion.deleteCompany(companyKey, {
      dryRun: dryRun === 'true',
    });
  }

  // ==========================
  // CREATE (multipart) ✅ URL o FILES

  // ── Repair / re-provisioning endpoint (platform_admin only, DEC-018 §10.1) ──

  @Post(':companyId/provision')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Provision (or repair) default communication assets for a company (platform_admin only, DEC-017 §3)',
  })
  async reprovision(
    @CurrentUser() ctx: AuthContext,
    @Param('companyId') companyId: string,
  ) {
    if (ctx?.actorType !== 'user')
      throw new UnauthorizedException('Authentication required');
    const actor = await this.identity.findByIdOrThrow(ctx.userId!);
    if (actor.role !== 'platform_admin') {
      throw new ForbiddenException('Only platform_admin may use this endpoint');
    }
    // Determine whether this is the modules company so the correct provisioning
    // path runs: modules gets theme+layouts+domain+events; tenant gets theme+layouts only.
    const platformCompanyId = await this.identity.getPlatformCompanyId();
    const isPlatformCompany =
      !!platformCompanyId && platformCompanyId === companyId;
    return this.provisioning.provisionCompany(companyId, { isPlatformCompany });
  }

  // ==========================
  // Accepts either a JWT-authenticated user (set by GlobalAuthGuard) or the
  // internal COMMUNICATION_API_KEY header used by engine-to-engine calls.
  private assertAccess(
    apiKey: string | undefined,
    ctx: AuthContext | undefined,
  ): void {
    if (ctx?.actorType === 'user') return;
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (apiKey && expected && apiKey === expected) return;
    throw new UnauthorizedException('Authentication required');
  }

  // ==========================
  // UPDATE (by key) — JSON

  private toBool(v?: string) {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }

  // ==========================
  // DELETE (by key)

  private cleanUrl(v?: string): string {
    return String(v ?? '').trim();
  }
}
