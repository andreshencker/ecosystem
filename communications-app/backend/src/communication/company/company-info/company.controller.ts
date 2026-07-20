// src/company-info/company.controller.ts
import {
  BadRequestException,
  Body,
  ConflictException,
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
import { CreateCompanyWithOwnerDto } from './dto/create-company-with-owner.dto';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

import { MediaService } from '../../../files/media/services/media.service';
import { UsersService } from '../../../users/users.service';
import { UserInvitationsService } from '../../../user-invitations/user-invitations.service';
import { NotificationService } from '../../notifications/notification.service';
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
    private readonly users: UsersService,
    private readonly userInvitations: UserInvitationsService,
    private readonly notificationService: NotificationService,
    private readonly provisioning: CompanyProvisioningService,
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
    @CurrentUser() ctx: AuthContext | undefined,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertAccess(apiKey, ctx);
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(limit, offset);
    return this.companies.findAll({ active: this.toBool(active), limit: parsedLimit, offset: parsedOffset });
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
    this.provisioning.provisionCompany(String(created.id))
      .catch(err => this.logger.error(`Auto-provisioning failed for ${created.id}: ${err?.message}`));
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
    this.provisioning.provisionCompany(companyId)
      .catch(err => this.logger.error(`Auto-provisioning failed for ${companyId}: ${err?.message}`));

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
  @ApiOperation({ summary: 'Delete a company and all its associated data (cascade)' })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean, description: 'Preview what would be deleted without actually deleting anything' })
  async removeByKey(
    @Headers('x-api-key') apiKey: string,
    @CurrentUser() ctx: AuthContext | undefined,
    @Param('companyKey') companyKey: string,
    @Query('dryRun') dryRun?: string,
  ) {
    this.assertAccess(apiKey, ctx);
    return this.deletion.deleteCompany(companyKey, { dryRun: dryRun === 'true' });
  }

  // ==========================
  // CREATE (multipart) ✅ URL o FILES

  // ── Create company + owner (platform_admin only — DEC-014) ───────────────────

  @Post('with-owner')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a company and its initial company_owner (platform_admin only, DEC-014)' })
  async createWithOwner(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreateCompanyWithOwnerDto,
  ): Promise<{
    company: any;
    user: { id: string; email: string; firstName: string; lastName: string };
    emailDelivered: boolean;
    message: string;
    provisioning: any;
  }> {
    if (ctx?.actorType !== 'user') throw new UnauthorizedException('Authentication required');
    const actor = await this.users.findByIdOrThrow(ctx.userId!);
    if (actor.role !== 'platform_admin') {
      throw new ForbiddenException('Only platform_admin may use this endpoint');
    }

    const companyKey = this.slugify(dto.displayName);
    if (!companyKey) {
      throw new BadRequestException('displayName must contain at least one alphanumeric character');
    }

    // 1. Create company
    let company: any;
    try {
      company = await this.companies.create({
        companyKey,
        displayName: dto.displayName,
        timezone: dto.timezone,
      } as any);
    } catch (err: any) {
      if (err?.status === 400 && err?.message?.includes('already exists')) {
        throw new ConflictException(`A company with key "${companyKey}" already exists. Try a different name.`);
      }
      throw err;
    }

    // 2. Create company_owner — rollback company on conflict
    let user: any;
    let tempPassword: string;
    try {
      ({ user, tempPassword } = await this.users.createInvitedUser({
        email:      dto.ownerEmail,
        firstName:  dto.ownerFirstName,
        lastName:   dto.ownerLastName,
        role:       'company_owner',
        companyId:  String(company.id),
        companyKey: companyKey,
      }));
    } catch {
      await this.companies.removeByKey(companyKey).catch(() => void 0);
      throw new ConflictException(`An account with email "${dto.ownerEmail}" already exists.`);
    }

    // 3. Link ownerUserId on the company
    await this.companies.updateById(String(company.id), { ownerUserId: String(user._id ?? user.id) } as any);

    const loginUrl = (this.config.get<string>('APP_BASE_URL') || 'http://localhost:3000')
      .replace(/\/$/, '') + '/auth/login';

    // 4. Provision tenant branding assets (theme + layouts only — no domains/events for tenants).
    const provisioningReport = await this.provisioning.provisionCompany(String(company.id));

    // 5. Deliver invitation via NotificationEngine.
    // Route through the Platform Company (Grapifly) — the newly created tenant has no
    // security domain or provider credentials yet. The tenant name is passed as
    // data.companyName so the template renders "invited to join <TenantName>" while
    // the email is actually sent from Grapifly's SMTP credentials.
    let emailDelivered = false;
    const platformCompanyId = await this.users.getPlatformCompanyId().catch(() => null);
    if (!platformCompanyId) {
      this.logger.warn(
        `company_user_invitation: platform company not found — notification skipped for ${dto.ownerEmail}`,
      );
    } else {
      try {
        this.logger.log(
          `[company_user_invitation] event=security.company_user_invitation` +
          ` senderCompanyId=${platformCompanyId} tenantCompanyId=${String(company.id)}` +
          ` companyName=${dto.displayName} recipient=${dto.ownerEmail}`,
        );
        const notifyResult = await this.notificationService.notifyEvent({
          companyId: platformCompanyId,
          event:     'security.company_user_invitation',
          email:     dto.ownerEmail,
          payload: {
            data: {
              firstName:   dto.ownerFirstName,
              companyName: dto.displayName,
              role:        'company_owner',
              email:       dto.ownerEmail,
              tempPassword,
              loginUrl,
            },
          },
        });
        emailDelivered = notifyResult.results.some((r) => r.success);
        if (!emailDelivered) {
          const notifyError = notifyResult.results.map((r) => r.error).filter(Boolean).join('; ');
          this.logger.warn(`company_user_invitation did not deliver for ${dto.ownerEmail}: ${notifyError}`);
        }
      } catch (err: any) {
        this.logger.warn(`company_user_invitation notification failed for ${dto.ownerEmail}: ${err?.message}`);
      }
    }

    // 6. Invitation audit record
    await this.userInvitations.createInvitationRecord({
      userId:          String(user._id ?? user.id),
      email:           dto.ownerEmail,
      firstName:       dto.ownerFirstName,
      lastName:        dto.ownerLastName,
      role:            'company_owner',
      companyId:       String(company.id),
      companyKey:      companyKey,
      invitedByUserId: ctx.userId!,
      invitationScope: 'company',
      status:          emailDelivered ? 'pending' : 'pending_delivery',
    });

    const message = emailDelivered
      ? `Company created. Invitation sent to ${dto.ownerEmail}.`
      : `Company created. Invitation email could not be delivered. Please configure the company email provider credentials and try again.`;

    return {
      company,
      user: {
        id:        String(user._id ?? user.id),
        email:     dto.ownerEmail,
        firstName: dto.ownerFirstName,
        lastName:  dto.ownerLastName,
      },
      emailDelivered,
      message,
      provisioning: provisioningReport,
    };
  }

  // ── Repair / re-provisioning endpoint (platform_admin only, DEC-018 §10.1) ──

  @Post(':companyId/provision')
  @HttpCode(200)
  @ApiOperation({ summary: 'Provision (or repair) default communication assets for a company (platform_admin only, DEC-017 §3)' })
  async reprovision(
    @CurrentUser() ctx: AuthContext,
    @Param('companyId') companyId: string,
  ) {
    if (ctx?.actorType !== 'user') throw new UnauthorizedException('Authentication required');
    const actor = await this.users.findByIdOrThrow(ctx.userId!);
    if (actor.role !== 'platform_admin') {
      throw new ForbiddenException('Only platform_admin may use this endpoint');
    }
    // Determine whether this is the modules company so the correct provisioning
    // path runs: modules gets theme+layouts+domain+events; tenant gets theme+layouts only.
    const platformCompanyId = await this.users.getPlatformCompanyId();
    const isPlatformCompany  = !!platformCompanyId && platformCompanyId === companyId;
    return this.provisioning.provisionCompany(companyId, { isPlatformCompany });
  }

  // ==========================
  // Accepts either a JWT-authenticated user (set by GlobalAuthGuard) or the
  // internal COMMUNICATION_API_KEY header used by engine-to-engine calls.
  private assertAccess(apiKey: string | undefined, ctx: AuthContext | undefined): void {
    if (ctx?.actorType === 'user') return;
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (apiKey && expected && apiKey === expected) return;
    throw new UnauthorizedException('Authentication required');
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
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
