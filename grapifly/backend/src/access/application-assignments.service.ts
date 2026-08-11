import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationsService } from '../applications/applications.service';
import { UsersService } from '../users/users.service';
import { ApplicationAssignment, ApplicationAssignmentDocument } from './schemas/application-assignment.schema';

const DEFAULT_RELAY_USERS = [
  'grapiflydeveloper@gmail.com',
  'grapiflytrading@gmail.com',
  'grapiflyvideo@gmail.com',
  'andreshenckerq@gmail.com',
];

@Injectable()
export class ApplicationAssignmentsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ApplicationAssignmentsService.name);

  constructor(
    @InjectModel(ApplicationAssignment.name) private readonly assignments: Model<ApplicationAssignmentDocument>,
    private readonly users: UsersService,
    private readonly applications: ApplicationsService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const relay = await this.applications.findByKey('relay');
    if (!relay) {
      this.logger.warn('Relay is not present in the application catalogue; access bootstrap skipped.');
      return;
    }
    const configured = this.config.get<string>('RELAY_INITIAL_ACCESS_EMAILS');
    const emails = configured ? configured.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean) : DEFAULT_RELAY_USERS;
    let created = 0;
    for (const email of emails) {
      const user = await this.users.findByEmail(email);
      if (!user) {
        this.logger.warn(`Relay access pending: Grapifly user not found (${email}).`);
        continue;
      }
      await this.assignments.findOneAndUpdate(
        { grapiflyUserId: user.grapiflyUserId, applicationKey: 'relay' },
        { $set: { status: 'active' }, $setOnInsert: { source: 'bootstrap', grantedAt: new Date() } },
        { upsert: true, returnDocument: 'after' },
      );
      created += 1;
    }
    this.logger.log(`Relay access catalogue ready (${created} active assignments).`);
  }

  async listAll() {
    const [assignments, users, applications] = await Promise.all([
      this.assignments.find().sort({ applicationKey: 1, grantedAt: 1 }).lean(),
      this.users.listAll(),
      this.applications.listAll(),
    ]);
    const usersById = new Map(users.map((user) => [user.grapiflyUserId, user]));
    const appsByKey = new Map(applications.map((app) => [app.key, app]));
    return assignments.map((assignment) => ({
      ...assignment,
      user: usersById.get(assignment.grapiflyUserId) ?? null,
      application: appsByKey.get(assignment.applicationKey) ?? null,
    }));
  }

  hasActiveAccess(grapiflyUserId: string, applicationKey: string) {
    return this.assignments.exists({ grapiflyUserId, applicationKey, status: 'active' });
  }
}
