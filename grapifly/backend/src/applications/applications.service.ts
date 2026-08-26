import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import type { RoleFlow } from '../roles/role-catalog.service';
import {
  Application,
  ApplicationCountryRestriction,
  ApplicationDefaultAccess,
  ApplicationDocument,
  ApplicationTheme,
  DEFAULT_ACCESS,
  DEFAULT_COUNTRY_RESTRICTION,
  DEFAULT_THEME,
} from './schemas/application.schema';
import { ApplicationResponseDto, toApplicationResponse } from './dto/application-response.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateApplicationResponseDto } from './dto/create-application-response.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { DeleteApplicationResponseDto } from './dto/delete-application-response.dto';
import type { ApplicationPublicConfigDto } from './dto/application-public-config.dto';
import { RelayMediaService } from '../relay-media/relay-media.service';

const ALL_FLOWS: RoleFlow[] = ['client', 'provider', 'internal'];

const CATALOGUE_THEMES: Record<string, ApplicationTheme> = {
  relay: {
    icon: 'R', logoUrl: null, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
    light: { primaryColor: '#F4733D', backgroundColor: '#F7F7F9', textColor: '#111116' },
    dark: { primaryColor: '#FF8A5B', backgroundColor: '#17151F', textColor: '#F5F4FA' },
  },
  business: {
    icon: 'B', logoUrl: null, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
    light: { primaryColor: '#5C47CE', backgroundColor: '#F7F7FB', textColor: '#111116' },
    dark: { primaryColor: '#8F7DFF', backgroundColor: '#17151F', textColor: '#F5F4FA' },
  },
  jtrade: {
    icon: 'J', logoUrl: null, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
    light: { primaryColor: '#F0B90B', backgroundColor: '#F5F5F7', textColor: '#111116' },
    dark: { primaryColor: '#FFD84D', backgroundColor: '#17151F', textColor: '#F5F4FA' },
  },
};

const APPLICATION_CATALOGUE = [
  {
    key: 'relay', name: 'Relay', description: 'Secure connections and automation across external services.', launchUrl: 'http://localhost:3000', ownership: 'first_party', status: 'active', displayOrder: 1,
    // Relay is the only app auto-granted to every new organization today —
    // matches current behaviour (see UsersService.ensureDefaultOrganization).
    defaultAccess: { autoGrantOnSignup: true, tier: 'free', requiresApproval: false },
    secretEnvVar: 'RELAY_SERVICE_SECRET',
    // Falls back to the legacy shared secret so existing Relay deployments
    // keep working unchanged until they're migrated to their own secret.
    secretEnvFallback: 'GRAPIFLY_SSO_CLIENT_SECRET',
    // Callback URLs are owned by the central application catalogue.
    ssoCallbackUrlEnvVar: 'RELAY_SSO_CALLBACK_URL',
  },
  {
    key: 'business', name: 'Business', description: 'Business operations, invoicing and administration.', launchUrl: 'http://localhost:3003', ownership: 'first_party', status: 'active', displayOrder: 2,
    defaultAccess: { autoGrantOnSignup: false, tier: 'free', requiresApproval: false },
    secretEnvVar: 'BUSINESS_SERVICE_SECRET',
    secretEnvFallback: null,
    ssoCallbackUrlEnvVar: null,
  },
  {
    key: 'jtrade', name: 'JTrade', description: 'Trading, investment and market operations.', launchUrl: 'http://localhost:5173', ownership: 'first_party', status: 'active', displayOrder: 3,
    defaultAccess: { autoGrantOnSignup: true, tier: 'trial', requiresApproval: false },
    secretEnvVar: 'JTRADE_SERVICE_SECRET',
    secretEnvFallback: null,
    ssoCallbackUrlEnvVar: 'JTRADE_SSO_CALLBACK_URL',
  },
] as const;

@Injectable()
export class ApplicationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ApplicationsService.name);
  constructor(
    @InjectModel(Application.name) private readonly applications: Model<ApplicationDocument>,
    private readonly config: ConfigService,
    private readonly relayMedia: RelayMediaService,
  ) {}

  async onApplicationBootstrap() {
    // Compatibility migration: applications created before the terminology
    // change may still list `owner` as a flow. Preserve access as `client`.
    await this.applications.updateMany(
      { allowedFlows: 'owner' as never },
      { $addToSet: { allowedFlows: 'client' } },
    );
    await this.applications.updateMany(
      { allowedFlows: 'owner' as never },
      { $pull: { allowedFlows: 'owner' as never } },
    );
    await Promise.all(APPLICATION_CATALOGUE.map((app) => {
      const { secretEnvVar, secretEnvFallback, ssoCallbackUrlEnvVar, ...catalogueEntry } = app;
      const secret =
        this.config.get<string>(secretEnvVar) ??
        (secretEnvFallback ? this.config.get<string>(secretEnvFallback) : undefined) ??
        `development-${app.key}-service-secret-change-me`;
      // Only included in $set (and only ever overwritten on boot) for apps that
      // declare an env var — business/jtrade leave their admin-set value alone.
      const ssoCallbackUrlPatch = ssoCallbackUrlEnvVar
        ? { ssoCallbackUrl: this.config.get<string>(ssoCallbackUrlEnvVar) ?? null }
        : {};
      return this.applications.findOneAndUpdate(
        { key: app.key },
        {
          $set: { ...catalogueEntry, serviceSecretHash: this.hashSecret(secret), ...ssoCallbackUrlPatch },
          $setOnInsert: { theme: CATALOGUE_THEMES[app.key] ?? DEFAULT_THEME },
        },
        { upsert: true, returnDocument: 'after' },
      );
    }));
    // Drop role lists from any pre-existing catalogue row — roles now live
    // in RoleCatalogService (one shared list per flow, not per app).
    // strict:false — these fields no longer exist on the schema, so Mongoose's
    // default strict mode would otherwise silently drop the $unset entirely.
    await this.applications.updateMany({}, { $unset: { ownerRoles: '', providerRoles: '' } }, { strict: false });
    // Backfill theme/countryRestriction/allowedFlows onto rows created before
    // these fields existed — findOneAndUpdate's $set above only touches the
    // fields listed in APPLICATION_CATALOGUE, so older documents are missing
    // them entirely (schema `default` only applies on document creation, not
    // on $set updates to an existing row).
    await Promise.all([
      this.applications.updateMany({ theme: { $exists: false } }, { $set: { theme: DEFAULT_THEME } }),
      this.applications.updateMany({ countryRestriction: { $exists: false } }, { $set: { countryRestriction: DEFAULT_COUNTRY_RESTRICTION } }),
      this.applications.updateMany({ allowedFlows: { $exists: false } }, { $set: { allowedFlows: ALL_FLOWS } }),
    ]);
    this.logger.log(`Application catalogue ready (${APPLICATION_CATALOGUE.length} applications).`);
  }

  async listAll(): Promise<ApplicationResponseDto[]> {
    const applications = await this.applications.find().sort({ displayOrder: 1, name: 1 }).lean();
    return applications.map(toApplicationResponse);
  }

  findByKey(key: string) {
    return this.applications.findOne({ key: key.toLowerCase(), status: 'active' }).lean();
  }

  async getPublicConfig(key: string): Promise<ApplicationPublicConfigDto> {
    const application = await this.findByKey(key);
    if (!application) throw new NotFoundException('Application not found');
    return {
      contractVersion: 1,
      key: application.key,
      name: application.name,
      description: application.description,
      launchUrl: application.launchUrl,
      theme: application.theme ?? CATALOGUE_THEMES[application.key] ?? DEFAULT_THEME,
      allowedFlows: application.allowedFlows,
    };
  }

  /** Includes the normally-excluded serviceSecretHash — only for service-to-service auth checks. */
  findByKeyWithSecret(key: string) {
    return this.applications.findOne({ key: key.toLowerCase(), status: 'active' }).select('+serviceSecretHash').lean();
  }

  hashSecret(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  async createApplication(dto: CreateApplicationDto): Promise<CreateApplicationResponseDto> {
    const key = this.normalizeKey(dto.key);
    const name = dto.name?.trim();
    const description = dto.description?.trim();
    const launchUrl = dto.launchUrl?.trim();
    if (!key) throw new BadRequestException('key is required');
    if (!name) throw new BadRequestException('name is required');
    if (!description) throw new BadRequestException('description is required');
    if (!launchUrl) throw new BadRequestException('launchUrl is required');
    if (await this.applications.exists({ key })) {
      throw new ConflictException(`An application with key "${key}" already exists`);
    }

    const displayOrder = dto.displayOrder ?? (await this.applications.countDocuments()) + 1;
    const serviceSecret = randomBytes(32).toString('hex');

    const created = await this.applications.create({
      key,
      name,
      description,
      launchUrl,
      ssoCallbackUrl: dto.ssoCallbackUrl?.trim() || null,
      ownership: dto.ownership ?? 'first_party',
      status: dto.status ?? 'active',
      displayOrder,
      serviceSecretHash: this.hashSecret(serviceSecret),
      theme: this.mergeTheme(DEFAULT_THEME, dto.theme),
      defaultAccess: this.mergeDefaultAccess(DEFAULT_ACCESS, dto.defaultAccess),
      countryRestriction: this.mergeCountryRestriction(DEFAULT_COUNTRY_RESTRICTION, dto.countryRestriction),
      allowedFlows: this.normalizeAllowedFlows(dto.allowedFlows),
    });

    return { ...toApplicationResponse(created), serviceSecret };
  }

  async updateApplication(key: string, dto: UpdateApplicationDto): Promise<ApplicationResponseDto> {
    const existing = await this.applications.findOne({ key: key.toLowerCase() }).lean();
    if (!existing) throw new NotFoundException('Application not found');

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      patch.name = name;
    }
    if (dto.description !== undefined) {
      const description = dto.description.trim();
      if (!description) throw new BadRequestException('description cannot be empty');
      patch.description = description;
    }
    if (dto.launchUrl !== undefined) {
      const launchUrl = dto.launchUrl.trim();
      if (!launchUrl) throw new BadRequestException('launchUrl cannot be empty');
      patch.launchUrl = launchUrl;
    }
    if (dto.ssoCallbackUrl !== undefined) patch.ssoCallbackUrl = dto.ssoCallbackUrl?.trim() || null;
    if (dto.ownership !== undefined) patch.ownership = dto.ownership;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.displayOrder !== undefined) patch.displayOrder = dto.displayOrder;
    if (dto.theme !== undefined) patch.theme = this.mergeTheme(existing.theme, dto.theme);
    if (dto.defaultAccess !== undefined) patch.defaultAccess = this.mergeDefaultAccess(existing.defaultAccess, dto.defaultAccess);
    if (dto.countryRestriction !== undefined) patch.countryRestriction = this.mergeCountryRestriction(existing.countryRestriction, dto.countryRestriction);
    if (dto.allowedFlows !== undefined) patch.allowedFlows = this.normalizeAllowedFlows(dto.allowedFlows);

    const updated = await this.applications.findOneAndUpdate(
      { key: existing.key },
      { $set: patch },
      { returnDocument: 'after' },
    ).lean();
    if (!updated) throw new NotFoundException('Application not found');
    return toApplicationResponse(updated);
  }

  async uploadLogo(key: string, file: Express.Multer.File): Promise<ApplicationResponseDto> {
    const existing = await this.applications.findOne({ key: key.toLowerCase() }).lean();
    if (!existing) throw new NotFoundException('Application not found');
    const uploaded = await this.relayMedia.uploadApplicationLogo(file, existing.key);
    return this.updateApplication(existing.key, { theme: { logoUrl: uploaded.url } } as UpdateApplicationDto);
  }

  async deleteApplication(key: string): Promise<DeleteApplicationResponseDto> {
    const deleted = await this.applications.findOneAndDelete({ key: key.toLowerCase() }).lean();
    if (!deleted) throw new NotFoundException('Application not found');
    return { key: deleted.key, deleted: true };
  }

  private mergeTheme(current: ApplicationTheme, patch?: CreateApplicationDto['theme']): ApplicationTheme {
    if (!patch) return current;
    const merged = {
      icon: patch.icon ?? current.icon,
      logoUrl: patch.logoUrl ?? current.logoUrl,
      fontFamily: patch.fontFamily ?? current.fontFamily,
      light: { ...current.light, ...patch.light },
      dark: { ...current.dark, ...patch.dark },
    };
    for (const [mode, palette] of Object.entries({ light: merged.light, dark: merged.dark })) {
      for (const [field, color] of Object.entries(palette)) {
        if (!/^#[0-9a-f]{6}$/i.test(color)) {
          throw new BadRequestException(`theme.${mode}.${field} must be a 6-digit hex color`);
        }
      }
    }
    return merged;
  }

  private mergeDefaultAccess(current: ApplicationDefaultAccess, patch?: Partial<ApplicationDefaultAccess>): ApplicationDefaultAccess {
    return patch ? { ...current, ...patch } : current;
  }

  private mergeCountryRestriction(current: ApplicationCountryRestriction, patch?: Partial<ApplicationCountryRestriction>): ApplicationCountryRestriction {
    return patch ? { ...current, ...patch } : current;
  }

  private normalizeAllowedFlows(flows?: RoleFlow[]): RoleFlow[] {
    if (!flows || flows.length === 0) return ALL_FLOWS;
    const invalid = flows.filter((flow) => !ALL_FLOWS.includes(flow));
    if (invalid.length) throw new BadRequestException(`Invalid flow(s): ${invalid.join(', ')} — must be one of: ${ALL_FLOWS.join(', ')}`);
    return Array.from(new Set(flows));
  }

  private normalizeKey(key: string): string {
    return (key ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  }
}
