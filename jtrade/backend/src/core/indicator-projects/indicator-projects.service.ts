import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  IndicatorProject,
  IndicatorProjectDocument,
} from './schemas/indicator-project.schema';

import {
  CompanyProvider,
  CompanyProviderDocument,
} from '../company-provider/schemas/company-provider.schema';

import {
  ProjectCodePlatform,
  ProjectCodePlatformDocument,
} from '../project-code-platform/schemas/project-code-platform.schema';

import {
  Indicator,
  IndicatorDocument,
} from '../indicators/schemas/indicator.schema';

import {
  UserProjectPlatform,
  UserProjectPlatformDocument,
} from '../user-project-platform/schemas/user-project-platform.schema';

import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

import { CreateIndicatorProjectDto } from './dto/create-indicator-project.dto';
import { UpdateIndicatorProjectDto } from './dto/update-indicator-project.dto';

@Injectable()
export class IndicatorProjectsService {
  constructor(
    @InjectModel(IndicatorProject.name)
    private readonly model: Model<IndicatorProjectDocument>,

    @InjectModel(CompanyProvider.name)
    private readonly companyProviderModel: Model<CompanyProviderDocument>,

    @InjectModel(ProjectCodePlatform.name)
    private readonly projectCodePlatformModel: Model<ProjectCodePlatformDocument>,

    @InjectModel(Indicator.name)
    private readonly indicatorModel: Model<IndicatorDocument>,

    @InjectModel(UserProjectPlatform.name)
    private readonly userProjectPlatformModel: Model<UserProjectPlatformDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private readonly populateFull = [
    {
      path: 'companyProvider',
      select: 'companyName status isVerified isActive',
    },
    {
      path: 'projectCodePlatform',
      select:
        'codeProjectId platformId deliveryMode runtimeMode status isActive notes',
      populate: [
        {
          path: 'codeProject',
          select:
            'name projectKey description isActive companyProviderId typeProjectId',
          populate: [
            {
              path: 'typeProjectId',
              select: 'key name isActive',
            },
          ],
        },
        {
          path: 'platform',
          select: 'name category connectionType imageUrl isActive isSupported',
        },
      ],
    },
    {
      path: 'indicator',
      select: 'name key description isActive companyProviderId',
    },
  ];

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    return new Types.ObjectId(id);
  }

  private cleanString(value?: string): string {
    return String(value ?? '').trim();
  }

  private async assertIsProvider(userId: string): Promise<void> {
    const user = await this.userModel
      .findById(this.toObjectId(userId))
      .select('role')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if ((user as any).role !== UserRole.PROVIDER) {
      throw new ForbiddenException('Only provider users allowed');
    }
  }

  private async getMyCompanyProvider(userId: string): Promise<any> {
    const ownerUserId = this.toObjectId(userId);

    const company = await this.companyProviderModel
      .findOne({
        ownerUserId,
        isActive: true,
      })
      .lean();

    if (!company) {
      throw new ForbiddenException(
        'Provider company not found. Create your company profile first.',
      );
    }

    return company;
  }

  private async validateProjectCodePlatformBelongsToCompany(
    companyProviderId: Types.ObjectId,
    projectCodePlatformId: Types.ObjectId,
  ): Promise<void> {
    const projectCodePlatform = await this.projectCodePlatformModel
      .findById(projectCodePlatformId)
      .select('codeProjectId isActive')
      .populate({
        path: 'codeProject',
        select: 'companyProviderId isActive',
      })
      .lean()
      .exec();

    if (!projectCodePlatform) {
      throw new NotFoundException('ProjectCodePlatform not found');
    }

    if ((projectCodePlatform as any).isActive === false) {
      throw new BadRequestException('ProjectCodePlatform is inactive');
    }

    const codeProject = (projectCodePlatform as any).codeProject;

    if (!codeProject) {
      throw new NotFoundException('CodeProject not found');
    }

    if ((codeProject as any).isActive === false) {
      throw new BadRequestException('CodeProject is inactive');
    }

    if (
      String((codeProject as any).companyProviderId) !==
      String(companyProviderId)
    ) {
      throw new ForbiddenException(
        'ProjectCodePlatform does not belong to this provider company',
      );
    }
  }

  private async validateIndicatorBelongsToCompany(
    companyProviderId: Types.ObjectId,
    indicatorId: Types.ObjectId,
  ): Promise<void> {
    const indicator = await this.indicatorModel
      .findOne({
        _id: indicatorId,
        companyProviderId,
        isActive: true,
      })
      .select('_id')
      .lean()
      .exec();

    if (!indicator) {
      throw new NotFoundException(
        'Indicator not found for this provider company',
      );
    }
  }

  async createMine(
    userId: string,
    dto: CreateIndicatorProjectDto,
  ): Promise<any> {
    await this.assertIsProvider(userId);

    const company = await this.getMyCompanyProvider(userId);

    const companyProviderId = this.toObjectId(company._id);
    const projectCodePlatformId = this.toObjectId(dto.projectCodePlatformId);
    const indicatorId = this.toObjectId(dto.indicatorId);

    await this.validateProjectCodePlatformBelongsToCompany(
      companyProviderId,
      projectCodePlatformId,
    );

    await this.validateIndicatorBelongsToCompany(
      companyProviderId,
      indicatorId,
    );

    try {
      const created = await this.model.create({
        companyProviderId,
        projectCodePlatformId,
        indicatorId,
        isActive: dto.isActive ?? true,
        notes: this.cleanString(dto.notes),
      });

      return this.model
        .findById(created._id)
        .populate(this.populateFull as any)
        .lean()
        .exec();
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException(
          'This indicator is already assigned to this project platform',
        );
      }

      throw e;
    }
  }

  async listMine(userId: string): Promise<any[]> {
    await this.assertIsProvider(userId);

    const company = await this.getMyCompanyProvider(userId);

    return this.model
      .find({
        companyProviderId: company._id,
      })
      .sort({ createdAt: -1 })
      .populate(this.populateFull as any)
      .lean()
      .exec();
  }

  async listAvailableForClient(
    userId: string,
    userProjectPlatformId?: string,
  ): Promise<any[]> {
    const userObjectId = this.toObjectId(userId);

    const subscriptions = await this.userProjectPlatformModel
      .find({
        userId: userObjectId,
        isActive: true,
      })
      .select('projectCodePlatformId')
      .lean()
      .exec();

    if (!subscriptions.length) {
      return [];
    }

    const allowedProjectPlatformIds = subscriptions.map((item: any) =>
      String(item.projectCodePlatformId),
    );

    const filter: any = {
      isActive: true,
      projectCodePlatformId: {
        $in: allowedProjectPlatformIds.map((id) => new Types.ObjectId(id)),
      },
    };

    if (userProjectPlatformId) {
      const projectPlatformObjectId = this.toObjectId(userProjectPlatformId);

      const exists = allowedProjectPlatformIds.includes(
        String(projectPlatformObjectId),
      );

      if (!exists) {
        throw new ForbiddenException(
          'You do not have access to this project platform',
        );
      }

      filter.projectCodePlatformId = projectPlatformObjectId;
    }

    return this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .populate(this.populateFull as any)
      .lean()
      .exec();
  }

  async findMineById(userId: string, id: string): Promise<any> {
    await this.assertIsProvider(userId);

    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id);

    const doc = await this.model
      .findOne({
        _id,
        companyProviderId: company._id,
      })
      .populate(this.populateFull as any)
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException('Indicator project not found');
    }

    return doc;
  }

  async updateMine(
    userId: string,
    id: string,
    dto: UpdateIndicatorProjectDto,
  ): Promise<any> {
    await this.assertIsProvider(userId);

    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id);

    const update: any = {};

    if (typeof dto.isActive === 'boolean') {
      update.isActive = dto.isActive;
    }

    if (typeof dto.notes === 'string') {
      update.notes = this.cleanString(dto.notes);
    }

    if (Object.keys(update).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.model
      .findOneAndUpdate(
        {
          _id,
          companyProviderId: company._id,
        },
        update,
        {
          new: true,
          runValidators: true,
        },
      )
      .populate(this.populateFull as any)
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Indicator project not found');
    }

    return updated;
  }

  async removeMine(userId: string, id: string): Promise<{ deleted: boolean }> {
    await this.assertIsProvider(userId);

    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id);

    const res = await this.model.deleteOne({
      _id,
      companyProviderId: company._id,
    });

    if (res.deletedCount === 0) {
      throw new NotFoundException('Indicator project not found');
    }

    return { deleted: true };
  }

  async findAll(params?: {
    companyProviderId?: string;
    projectCodePlatformId?: string;
    indicatorId?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    const filter: any = {};

    if (params?.companyProviderId) {
      filter.companyProviderId = this.toObjectId(params.companyProviderId);
    }

    if (params?.projectCodePlatformId) {
      filter.projectCodePlatformId = this.toObjectId(
        params.projectCodePlatformId,
      );
    }

    if (params?.indicatorId) {
      filter.indicatorId = this.toObjectId(params.indicatorId);
    }

    if (typeof params?.isActive === 'boolean') {
      filter.isActive = params.isActive;
    }

    return this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .populate(this.populateFull as any)
      .lean()
      .exec();
  }

  async findOne(id: string): Promise<any> {
    const _id = this.toObjectId(id);

    const doc = await this.model
      .findById(_id)
      .populate(this.populateFull as any)
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException('Indicator project not found');
    }

    return doc;
  }

  async deactivate(id: string): Promise<{ deactivated: boolean }> {
    const _id = this.toObjectId(id);

    const updated = await this.model.findByIdAndUpdate(
      _id,
      { isActive: false },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Indicator project not found');
    }

    return { deactivated: true };
  }
}
