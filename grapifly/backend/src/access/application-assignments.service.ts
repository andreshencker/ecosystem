import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
      const isTrial = app.defaultAccess.tier === 'trial';
      await this.organizationApplications.findOneAndUpdate(
        { organizationId, applicationKey: app.key },
        {
          $set: { status: 'active', tier: app.defaultAccess.tier, enabledBy: grapiflyUserId },
          ...(isTrial ? { $setOnInsert: { trialStartedAt: new Date() } } : {}),
        },
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
   * Grants the specific app a brand-new provider signed up through — unlike
   * grantDefaultAccess() (which only covers apps flagged autoGrantOnSignup),
   * this always targets the one app the person registered as a provider for.
   * Lands as 'pending' when the app's catalogue entry requires approval, so
   * resolveApplicationAccess() blocks the SSO exchange until an admin
   * approves it via updateStatus().
   */
  async grantProviderSignup(grapiflyUserId: string, organizationId: string, appKey: string): Promise<void> {
    const application = await this.applications.findByKey(appKey);
    if (!application || !application.allowedFlows?.includes('provider')) return;
    const status = application.defaultAccess.requiresApproval ? 'pending' : 'active';
    const isTrial = application.defaultAccess.tier === 'trial';
    await this.organizationApplications.findOneAndUpdate(
      { organizationId, applicationKey: appKey },
      {
        $set: { status: 'active', tier: application.defaultAccess.tier, enabledBy: grapiflyUserId },
        ...(isTrial ? { $setOnInsert: { trialStartedAt: new Date() } } : {}),
      },
      { upsert: true, returnDocument: 'after' },
    );
    await this.memberApplications.findOneAndUpdate(
      { organizationId, grapiflyUserId, applicationKey: appKey },
      { $set: { role: 'owner', status: 'active' } },
      { upsert: true, returnDocument: 'after' },
    );
    await this.assignments.findOneAndUpdate(
      { grapiflyUserId, applicationKey: appKey },
      { $set: { status }, $setOnInsert: { source: 'auto', grantedAt: new Date() } },
      { upsert: true, returnDocument: 'after' },
    );
  }

  /** Admin approve/reject/suspend/revoke of a single provider assignment. */
  async updateStatus(assignmentId: string, status: 'active' | 'pending' | 'rejected' | 'suspended' | 'revoked') {
    const assignment = await this.assignments.findByIdAndUpdate(assignmentId, { $set: { status } }, { new: true }).lean();
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  /**
   * Validates a service-to-service call as coming from the app registered
   * under `appKey` in the catalogue — replaces assertRelayClient's single
   * global secret with a secret scoped to that specific app.
   */
  async assertAppClient(appKey: string | undefined, candidate: string | undefined): Promise<void> {
    if (!appKey) {
      throw new ForbiddenException('Invalid Grapifly application client');
    }
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
