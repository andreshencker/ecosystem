import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoleCatalogEntry, RoleCatalogEntryDocument } from './schemas/role-catalog-entry.schema';
import { RoleResponseDto, toRoleResponse } from './dto/role-response.dto';
import { DeleteRoleResponseDto } from './dto/delete-role-response.dto';

export type RoleFlow = 'client' | 'provider' | 'internal';
const FLOWS: RoleFlow[] = ['client', 'provider', 'internal'];

const SEED: { flow: RoleFlow; roleKey: string; description: string; displayOrder: number }[] = [
  { flow: 'client', roleKey: 'owner', description: 'Full control of the organization', displayOrder: 1 },
  { flow: 'client', roleKey: 'admin', description: 'Can administer, without being the owner', displayOrder: 2 },
  { flow: 'client', roleKey: 'member', description: 'Regular use, no administration capabilities', displayOrder: 3 },
  { flow: 'client', roleKey: 'viewer', description: 'View-only, cannot modify anything', displayOrder: 4 },

  { flow: 'provider', roleKey: 'owner', description: 'Full control over the registered app', displayOrder: 1 },
  { flow: 'provider', roleKey: 'admin', description: 'Can administer the registered app, without being the owner', displayOrder: 2 },
  { flow: 'provider', roleKey: 'member', description: 'Regular use within the registered app’s team', displayOrder: 3 },
  { flow: 'provider', roleKey: 'viewer', description: 'View-only access to the registered app', displayOrder: 4 },

  { flow: 'internal', roleKey: 'ecosystem_super_admin', description: 'Full control of the ecosystem', displayOrder: 1 },
  { flow: 'internal', roleKey: 'ecosystem_admin', description: 'Support and visibility, without configuration power', displayOrder: 2 },
];

@Injectable()
export class RoleCatalogService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoleCatalogService.name);

  constructor(
    @InjectModel(RoleCatalogEntry.name) private readonly entries: Model<RoleCatalogEntryDocument>,
  ) {}

  async onApplicationBootstrap() {
    // Compatibility migration: `owner` used to be the client flow name.
    // The `owner` role itself remains unchanged.
    await this.entries.updateMany(
      { flow: 'owner' as never },
      { $set: { flow: 'client' } },
    );
    await Promise.all(SEED.map((entry) => this.entries.findOneAndUpdate(
      { flow: entry.flow, roleKey: entry.roleKey },
      { $set: entry },
      { upsert: true, returnDocument: 'after' },
    )));
    this.logger.log(`Role catalogue ready (${SEED.length} roles across 3 flows).`);
  }

  async listAll(): Promise<RoleResponseDto[]> {
    const entries = await this.entries.find().sort({ flow: 1, displayOrder: 1 }).lean();
    return entries.map(toRoleResponse);
  }

  async listByFlow(flow: RoleFlow): Promise<RoleResponseDto[]> {
    const entries = await this.entries.find({ flow }).sort({ displayOrder: 1 }).lean();
    return entries.map(toRoleResponse);
  }

  async isValidRole(flow: RoleFlow, roleKey: string): Promise<boolean> {
    return this.entries.exists({ flow, roleKey }).then(Boolean);
  }

  async rolesForFlow(flow: RoleFlow): Promise<string[]> {
    const entries = await this.listByFlow(flow);
    return entries.map((entry) => entry.roleKey);
  }

  async createRole(flow: RoleFlow, roleKeyInput: string, descriptionInput: string): Promise<RoleResponseDto> {
    this.requireValidFlow(flow);
    const roleKey = this.normalizeKey(roleKeyInput);
    const description = descriptionInput?.trim();
    if (!roleKey) throw new BadRequestException('roleKey is required');
    if (!description) throw new BadRequestException('description is required');
    if (await this.entries.exists({ flow, roleKey })) {
      throw new ConflictException(`El rol "${roleKey}" ya existe para el flujo "${flow}"`);
    }
    const count = await this.entries.countDocuments({ flow });
    const created = await this.entries.create({ flow, roleKey, description, displayOrder: count + 1 });
    return toRoleResponse(created);
  }

  async updateRole(flow: RoleFlow, roleKey: string, descriptionInput: string): Promise<RoleResponseDto> {
    this.requireValidFlow(flow);
    const description = descriptionInput?.trim();
    if (!description) throw new BadRequestException('description is required');
    const updated = await this.entries.findOneAndUpdate(
      { flow, roleKey },
      { $set: { description } },
      { returnDocument: 'after' },
    ).lean();
    if (!updated) throw new NotFoundException('Role not found');
    return toRoleResponse(updated);
  }

  async deleteRole(flow: RoleFlow, roleKey: string): Promise<DeleteRoleResponseDto> {
    this.requireValidFlow(flow);
    const deleted = await this.entries.findOneAndDelete({ flow, roleKey }).lean();
    if (!deleted) throw new NotFoundException('Role not found');
    return { flow, roleKey, deleted: true };
  }

  private requireValidFlow(flow: string): asserts flow is RoleFlow {
    if (!FLOWS.includes(flow as RoleFlow)) {
      throw new BadRequestException(`Invalid flow — must be one of: ${FLOWS.join(', ')}`);
    }
  }

  private normalizeKey(roleKey: string): string {
    return (roleKey ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  }
}
