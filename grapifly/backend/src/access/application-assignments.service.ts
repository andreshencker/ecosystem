import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationAssignment, ApplicationAssignmentDocument } from './schemas/application-assignment.schema';
import {
  OrganizationApplication,
  OrganizationApplicationDocument,
} from '../organizations/schemas/organization-application.schema';
import {
  OrganizationMemberApplication,
  OrganizationMemberApplicationDocument,
} from '../organizations/schemas/organization-member-application.schema';
import { GrapiflyUser, GrapiflyUserDocument } from '../users/schemas/user.schema';

/**
 * The ecosystem's access "gestor" — the one place that decides and grants
 * app access, reading the rule from the Application catalogue instead of
 * having each caller hardcode which app(s) a new organization should get.
 */
@Injectable()
export class ApplicationAssignmentsService {
  constructor(
    @InjectModel(ApplicationAssignment.name) private readonly assignments: Model<ApplicationAssignmentDocument>,
    @InjectModel(OrganizationApplication.name) private readonly organizationApplications: Model<OrganizationApplicationDocument>,
    @InjectModel(OrganizationMemberApplication.name) private readonly memberApplications: Model<OrganizationMemberApplicationDocument>,
    @InjectModel(GrapiflyUser.name) private readonly users: Model<GrapiflyUserDocument>,
    private readonly applications: ApplicationsService,
  ) {}

  /**
   * Grants every catalogue app marked `defaultAccess.autoGrantOnSignup` to a
   * newly created organization, and gives its owner the 'owner' role on each.
   * Replaces the hardcoded `applicationKey: 'relay'` writes that used to live
   * inline in UsersService/OrganizationsService.
   */
  async grantDefaultAccess(grapiflyUserId: string, organizationId: string): Promise<string[]> {
    const applications = await this.applications.listAll();
    const defaults = applications.filter((app) => app.status === 'active' && app.defaultAccess?.autoGrantOnSignup);
    for (const app of defaults) {
      await this.organizationApplications.findOneAndUpdate(
        { organizationId, applicationKey: app.key },
        { $set: { status: 'active', enabledBy: grapiflyUserId } },
        { upsert: true, returnDocument: 'after' },
      );
      await this.memberApplications.findOneAndUpdate(
        { organizationId, grapiflyUserId, applicationKey: app.key },
        { $set: { role: 'owner', status: 'active' } },
        { upsert: true, returnDocument: 'after' },
      );
      await this.assignments.findOneAndUpdate(
        { grapiflyUserId, applicationKey: app.key },
        { $set: { status: 'active' }, $setOnInsert: { source: 'auto', grantedAt: new Date() } },
        { upsert: true, returnDocument: 'after' },
      );
    }
    return defaults.map((app) => app.key);
  }

  /**
   * Validates a service-to-service call as coming from the app registered
   * under `appKey` in the catalogue — replaces assertRelayClient's single
   * global secret with a secret scoped to that specific app.
   */
  async assertAppClient(appKey: string, candidate: string | undefined): Promise<void> {
    const application = await this.applications.findByKeyWithSecret(appKey);
    if (!application?.serviceSecretHash || !candidate) {
      throw new ForbiddenException('Invalid Grapifly application client');
    }
    const candidateHash = this.applications.hashSecret(candidate);
    const actualBuffer = Buffer.from(candidateHash);
    const expectedBuffer = Buffer.from(application.serviceSecretHash);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new ForbiddenException('Invalid Grapifly application client');
    }
  }

  async listAll() {
    const [assignments, users, applications] = await Promise.all([
      this.assignments.find().sort({ applicationKey: 1, grantedAt: 1 }).lean(),
      this.users.find().lean(),
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
