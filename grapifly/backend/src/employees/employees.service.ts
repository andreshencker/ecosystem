import { ForbiddenException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { EmployeeProfile, EmployeeProfileDocument } from './schemas/employee-profile.schema';

@Injectable()
export class EmployeesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectModel(EmployeeProfile.name)
    private readonly employees: Model<EmployeeProfileDocument>,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = (this.config.get<string>('ECOSYSTEM_SUPER_ADMIN_EMAIL') ?? 'grapiflydeveloper@gmail.com')
      .toLowerCase()
      .trim();
    const user = await this.users.findByEmail(email);

    if (!user) {
      this.logger.warn(`Super admin seed pending: ${email} must sign in to Grapifly first.`);
      return;
    }

    await this.employees.findOneAndUpdate(
      { email },
      {
        $set: {
          grapiflyUserId: user.grapiflyUserId,
          role: 'ecosystem_super_admin',
          status: 'active',
          department: 'Platform',
          title: 'Ecosystem Super Admin',
        },
        $setOnInsert: { email },
      },
      { upsert: true, new: true },
    );
    this.logger.log(`Employee seed ready: ${email} (ecosystem_super_admin).`);
  }

  async requireActiveEmployee(grapiflyUserId: string) {
    const employee = await this.employees.findOne({ grapiflyUserId, status: 'active' }).lean();
    if (!employee) throw new ForbiddenException('Employee portal access is required');
    return employee;
  }

  findActiveEmployee(grapiflyUserId: string) {
    return this.employees.findOne({ grapiflyUserId, status: 'active' }).lean();
  }
}
