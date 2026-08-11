import { ForbiddenException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { PlatformAdmin, PlatformAdminDocument } from './schemas/platform-admin.schema';

@Injectable()
export class PlatformAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(
    @InjectModel(PlatformAdmin.name) private readonly admins: Model<PlatformAdminDocument>,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = (this.config.get<string>('ECOSYSTEM_SUPER_ADMIN_EMAIL') ?? 'grapiflydeveloper@gmail.com').toLowerCase().trim();
    const user = await this.users.findByEmail(email);
    if (!user) {
      this.logger.warn(`Super admin seed pending: ${email} must sign in to Grapifly first.`);
      return;
    }
    await this.admins.findOneAndUpdate(
      { email },
      { $set: { grapiflyUserId: user.grapiflyUserId, role: 'ecosystem_super_admin', status: 'active' }, $setOnInsert: { email } },
      { upsert: true, returnDocument: 'after' },
    );
    this.logger.log(`Platform admin ready: ${email} (ecosystem_super_admin).`);
  }

  async requireActiveAdmin(grapiflyUserId: string) {
    const admin = await this.admins.findOne({ grapiflyUserId, status: 'active' }).lean();
    if (!admin) throw new ForbiddenException('Grapifly administration access is required');
    return admin;
  }
}
