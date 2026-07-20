// src/company-info/company.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/modules-express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePagination } from '../../common/pagination/pagination.util';

import { CompanyService } from './company.service';
import { CreateCompanyMultipartDto } from './dto/create-company-multipart.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

import { MediaService } from '../../files/media/services/media.service';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly config: ConfigService,
    private readonly companies: CompanyService,
    private readonly media: MediaService,
  ) {}

  // ==========================
  // Helpers

  // ==========================
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List companies' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max records (1–200, default 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Records to skip (default 0)' })
  async list(
    @Headers('x-api-key') apiKey: string,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertApiKey(apiKey);
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(limit, offset);
    return this.companies.findAll({ active: this.toBool(active), limit: parsedLimit, offset: parsedOffset });
  }

  @Get('by-key/:companyKey')
  @HttpCode(200)
  async getByKey(
    @Headers('x-api-key') apiKey: string,
    @Param('companyKey') companyKey: string,
  ) {
    this.assertApiKey(apiKey);
    return this.companies.findByKey(companyKey);
  }

  @Get(':companyId')
  @HttpCode(200)
  async getById(
    @Headers('x-api-key') apiKey: string,
    @Param('companyId') companyId: string,
  ) {
    this.assertApiKey(apiKey);
    return this.companies.findById(companyId);
  }

  // ==========================
  // READ

  // ==========================
  @Post('json')
  @HttpCode(201)
  async createJson(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateCompanyDto,
  ) {
    this.assertApiKey(apiKey);
    return this.companies.create(dto);
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
    @Body() dto: CreateCompanyMultipartDto,
    @UploadedFiles()
    files?: {
      logoIconFile?: Express.Multer.File[];
      logoFullFile?: Express.Multer.File[];
    },
  ) {
    this.assertApiKey(apiKey);

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

    // 3) Si hubo uploads, persistimos URLs y devolvemos actualizado
    if (Object.keys(updates).length) {
      return this.companies.updateById(companyId, updates as any);
    }

    return created;
  }

  // ==========================
  @Patch(':companyKey')
  @HttpCode(200)
  async updateByKey(
    @Headers('x-api-key') apiKey: string,
    @Param('companyKey') companyKey: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    this.assertApiKey(apiKey);
    return this.companies.updateByKey(companyKey, dto);
  }

  // ==========================
  // CREATE (JSON) — opcional (por si aún lo usas)

  // ==========================
  @Delete(':companyKey')
  @HttpCode(200)
  async removeByKey(
    @Headers('x-api-key') apiKey: string,
    @Param('companyKey') companyKey: string,
  ) {
    this.assertApiKey(apiKey);
    return this.companies.removeByKey(companyKey);
  }

  // ==========================
  // CREATE (multipart) ✅ URL o FILES

  // ==========================
  private assertApiKey(apiKey: string) {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
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
