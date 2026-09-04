import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface DirectoryOrganization {
  organizationId: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'archived';
  isPlatform: boolean;
  isDefault: boolean;
}

export interface DirectoryUser {
  grapiflyUserId: string;
  displayName: string;
  avatarUrl: string | null;
}

const APP_KEY = 'jtrade';
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * jtrade's leg of the Ecosystem Internal API — Directory.
 * docs/architecture/ecosystem-internal-api.md
 *
 * Permission-free batch lookups: id -> display data. Used by back-office views
 * (e.g. admin payments) that aren't scoped to a single organization the
 * signed-in user belongs to. Results are cached briefly — names change rarely.
 */
@Injectable()
export class GrapiflyDirectoryService {
  private readonly log = new Logger(GrapiflyDirectoryService.name);
  private readonly orgCache = new Map<string, { value: DirectoryOrganization | null; at: number }>();
  private readonly userCache = new Map<string, { value: DirectoryUser | null; at: number }>();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async resolveOrganizations(ids: string[]): Promise<Map<string, DirectoryOrganization>> {
    return this.resolve(
      ids,
      this.orgCache,
      'organizations/resolve',
      'organizationIds',
      'organizations',
      (o: DirectoryOrganization) => o.organizationId,
    );
  }

  async resolveUsers(ids: string[]): Promise<Map<string, DirectoryUser>> {
    return this.resolve(
      ids,
      this.userCache,
      'users/resolve',
      'grapiflyUserIds',
      'users',
      (u: DirectoryUser) => u.grapiflyUserId,
    );
  }

  private async resolve<T>(
    rawIds: string[],
    cache: Map<string, { value: T | null; at: number }>,
    path: string,
    idField: string,
    listField: string,
    keyOf: (item: T) => string,
  ): Promise<Map<string, T>> {
    const ids = [...new Set(rawIds.map((v) => v?.trim()).filter(Boolean))];
    const result = new Map<string, T>();
    const now = Date.now();

    const missing: string[] = [];
    for (const id of ids) {
      const hit = cache.get(id);
      if (hit && now - hit.at < CACHE_TTL_MS) {
        if (hit.value) result.set(id, hit.value);
      } else {
        missing.push(id);
      }
    }
    if (missing.length === 0) return result;

    let items: T[] = [];
    try {
      const base = (this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101').replace(/\/$/, '');
      const secret = this.config.get<string>('JTRADE_SERVICE_SECRET');
      if (!secret) {
        this.log.warn('JTRADE_SERVICE_SECRET is not set — directory lookups disabled');
        return result;
      }

      const response = await firstValueFrom(
        this.http.post<{ contractVersion: number; data: Record<string, T[]> }>(
          `${base}/internal/directory/${path}`,
          { [idField]: missing },
          {
            timeout: 5000,
            headers: { 'x-ecosystem-app': APP_KEY, 'x-ecosystem-secret': secret },
          },
        ),
      );
      items = response.data?.data?.[listField] ?? [];
    } catch (error) {
      // Directory is best-effort enrichment — never break the caller over it.
      // The caller falls back to showing the raw id.
      this.log.warn(`Directory ${path} failed: ${(error as Error).message}`);
      return result;
    }

    const found = new Set<string>();
    for (const item of items) {
      const key = keyOf(item);
      found.add(key);
      cache.set(key, { value: item, at: now });
      result.set(key, item);
    }
    // Cache misses too, so a bad id doesn't hammer Grapifly every render.
    for (const id of missing) if (!found.has(id)) cache.set(id, { value: null, at: now });

    return result;
  }
}
