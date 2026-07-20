// src/controllers/communications/layout-templates.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '../../../core/users/schemas/user.schema';

import {
  LayoutTemplatesCommunicationsClient,
  type TemplateType,
} from './layout-templates.client';

import type { HttpResult } from '../communications-http.client';

@Controller('communications/layout-templates')
export class LayoutTemplatesController {
  constructor(private readonly client: LayoutTemplatesCommunicationsClient) {}

  // ✅ GET /communications/layout-templates/by-company?companyId=...&templateType=email&active=true&includeHtml=false
  @Roles(UserRole.ADMIN)
  @Get('by-company')
  async listByCompany(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('templateType') templateType?: TemplateType,
    @Query('active') active?: string,
    @Query('includeHtml') includeHtml?: string,
    @Query('populateTheme') populateTheme?: string,
    @Query('populateCompany') populateCompany?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.listByCompany(
      {
        companyId,
        templateType,
        active: this.toBool(active),
        includeHtml: this.toBool(includeHtml),
        populateTheme: this.toBool(populateTheme),
        populateCompany: this.toBool(populateCompany),
      },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  // ✅ GET /communications/layout-templates/default-by-company?companyId=...&templateType=email
  @Roles(UserRole.ADMIN)
  @Get('default-by-company')
  async defaultByCompany(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('templateType') templateType: TemplateType,
    @Query('populateTheme') populateTheme?: string,
    @Query('populateCompany') populateCompany?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.getDefaultByCompany(
      {
        companyId,
        templateType,
        populateTheme: this.toBool(populateTheme),
        populateCompany: this.toBool(populateCompany),
      },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  // ✅ GET /communications/layout-templates/company-overview?companyId=...&includeHtml=false
  @Roles(UserRole.ADMIN)
  @Get('company-overview')
  async companyOverview(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('includeHtml') includeHtml?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.companyOverview(
      { companyId, includeHtml: this.toBool(includeHtml) },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  // ✅ GET /communications/layout-templates/:id
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.getById(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  // ✅ POST /communications/layout-templates
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Req() req: Request, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.create(dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  // ✅ PATCH /communications/layout-templates/:id
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.update(id, dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  // ✅ DELETE /communications/layout-templates/:id
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.remove(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) return res.data as T;
    throw new HttpException(res.message ?? 'Upstream error', res.status || 502);
  }

  private toBool(v?: string): boolean | undefined {
    if (v === undefined) return undefined;
    const s = String(v).toLowerCase().trim();
    return s === 'true' || s === '1';
  }
}
