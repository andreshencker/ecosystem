import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Organization } from '../organizations/schemas/organization.schema';
import { GrapiflyUser } from '../users/schemas/user.schema';
import type {
  DirectoryOrganizationDto,
  DirectoryUserDto,
} from './dto/resolve.dto';

const MAX_IDS = 200;

/**
 * Permission-free, batch id → display-data lookups for other ecosystem apps.
 * Returns only non-sensitive fields (see docs/architecture/ecosystem-internal-api.md
 * §6). Anything sensitive stays on the membership-scoped /internal/apps routes.
 */
@Injectable()
export class DirectoryService {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizations: Model<Organization>,
    @InjectModel(GrapiflyUser.name)
    private readonly users: Model<GrapiflyUser>,
  ) {}

  async resolveOrganizations(ids: unknown): Promise<DirectoryOrganizationDto[]> {
    const clean = this.normalizeIds(ids, 'organizationIds');
    if (clean.length === 0) return [];

    const rows = await this.organizations
      .find({ organizationId: { $in: clean } })
      .select('organizationId name slug status isPlatform isDefault')
      .lean();

    return rows.map((row) => ({
      organizationId: row.organizationId,
      name: row.name,
      slug: row.slug,
      status: row.status,
      isPlatform: !!row.isPlatform,
      isDefault: !!row.isDefault,
    }));
  }

  async resolveUsers(ids: unknown): Promise<DirectoryUserDto[]> {
    const clean = this.normalizeIds(ids, 'grapiflyUserIds');
    if (clean.length === 0) return [];

    const rows = await this.users
      .find({ grapiflyUserId: { $in: clean } })
      .select('grapiflyUserId displayName avatarUrl')
      .lean();

    return rows.map((row) => ({
      grapiflyUserId: row.grapiflyUserId,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl ?? null,
    }));
  }

  private normalizeIds(value: unknown, field: string): string[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${field} must be an array of strings`);
    }
    const clean = [
      ...new Set(
        value
          .filter((v): v is string => typeof v === 'string')
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ];
    if (clean.length > MAX_IDS) {
      throw new BadRequestException(`${field} accepts at most ${MAX_IDS} ids per call`);
    }
    return clean;
  }
}
