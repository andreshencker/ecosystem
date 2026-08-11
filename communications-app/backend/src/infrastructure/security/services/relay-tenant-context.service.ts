import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Company,
  CompanyDocument,
} from '../../../communication/company/company-info/schemas/company.schema';
import type {
  AuthContext,
  UserRole,
  UserScope,
} from '../types/auth-context.types';

export interface RelayTenantContext {
  userId: string;
  companyId: string;
  companyKey: string;
  grapiflyOrganizationId: string;
  role: UserRole;
  scope: UserScope;
  permissions: string[];
  company: CompanyDocument;
}

/**
 * Canonical bridge between a Grapifly app session and Relay's technical tenant.
 * Portal services must never reconstruct this context from the legacy User record.
 */
@Injectable()
export class RelayTenantContextService {
  constructor(
    @InjectModel(Company.name)
    private readonly companies: Model<CompanyDocument>,
  ) {}

  async resolve(
    auth: AuthContext | undefined,
    requiredPermission = 'relay.use',
  ): Promise<RelayTenantContext> {
    if (
      auth?.actorType !== 'user' ||
      !auth.userId ||
      !auth.companyId ||
      !auth.grapiflyOrganizationId ||
      !auth.role ||
      !auth.scope
    ) {
      throw new ForbiddenException('A Grapifly organization session is required');
    }

    const permissions = auth.permissions ?? [];
    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `Missing Grapifly permission: ${requiredPermission}`,
      );
    }

    const company = await this.companies
      .findOne({
        _id: auth.companyId,
        grapiflyOrganizationId: auth.grapiflyOrganizationId,
        isActive: true,
      })
      .lean()
      .exec();

    if (!company) {
      throw new NotFoundException(
        'The active Grapifly organization is not available in Relay',
      );
    }

    return {
      userId: auth.userId,
      companyId: String(company._id),
      companyKey: company.companyKey,
      grapiflyOrganizationId: auth.grapiflyOrganizationId,
      role: auth.role,
      scope: auth.scope,
      permissions,
      company: company as CompanyDocument,
    };
  }
}
