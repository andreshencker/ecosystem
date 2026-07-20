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
  ProjectCodePlatform,
  ProjectCodePlatformDocument,
  ProjectCodePlatformStatus,
  ProjectDeliveryMode,
  ProjectRuntimeMode,
} from './schemas/project-code-platform.schema';

import {
  CodeProject,
  CodeProjectDocument,
} from '../code-projects/schemas/code-project.schema';

import {
  CompanyProvider,
  CompanyProviderDocument,
} from '../company-provider/schemas/company-provider.schema';

import {
  Platform,
  PlatformDocument,
} from '../platforms/schemas/platform.schema';

import { CreateProjectCodePlatformDto } from './dto/create-project-code-platform.dto';
import { UpdateProjectCodePlatformDto } from './dto/update-project-code-platform.dto';
import { ProjectCodePlatformResponseDto } from './dto/project-code-platform-response.dto';
import { ProjectCodePlatformMapper } from './mappers/project-code-platform.mapper';

@Injectable()
export class ProjectCodePlatformsService {
  constructor(
    @InjectModel(ProjectCodePlatform.name)
    private readonly projectCodePlatformModel: Model<ProjectCodePlatformDocument>,

    @InjectModel(CodeProject.name)
    private readonly codeProjectModel: Model<CodeProjectDocument>,

    @InjectModel(CompanyProvider.name)
    private readonly companyProviderModel: Model<CompanyProviderDocument>,

    @InjectModel(Platform.name)
    private readonly platformModel: Model<PlatformDocument>,
  ) {}

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

  private async ensurePlatform(platformId: string): Promise<void> {
    const _id = this.toObjectId(platformId);

    const exists = await this.platformModel.exists({
      _id,
      isActive: true,
    });

    if (!exists) {
      throw new BadRequestException('Invalid or inactive platform');
    }
  }

  private async getMyCodeProject(
    userId: string,
    codeProjectId: string,
  ): Promise<any> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(codeProjectId);

    const project = await this.codeProjectModel
      .findOne({
        _id,
        companyProviderId: company._id,
        isActive: true,
      })
      .lean();

    if (!project) {
      throw new NotFoundException('Code project not found for this provider');
    }

    return project;
  }

  private populateQuery(query: any) {
    return query
      .populate('codeProject', 'projectKey name companyProviderId')
      .populate(
        'platform',
        'name category imageUrl isActive isSupported connectionType',
      );
  }

  async createMyProjectPlatform(
    userId: string,
    dto: CreateProjectCodePlatformDto,
  ): Promise<ProjectCodePlatformResponseDto> {
    const project = await this.getMyCodeProject(userId, dto.codeProjectId);

    await this.ensurePlatform(dto.platformId);

    const codeProjectId = project._id;
    const platformId = this.toObjectId(dto.platformId);

    const exists = await this.projectCodePlatformModel.exists({
      codeProjectId,
      platformId,
    });

    if (exists) {
      throw new ConflictException(
        'This project is already assigned to this platform',
      );
    }

    const created = await this.projectCodePlatformModel.create({
      codeProjectId,
      platformId,

      deliveryMode: dto.deliveryMode ?? ProjectDeliveryMode.Download,
      runtimeMode: dto.runtimeMode ?? ProjectRuntimeMode.None,

      status: ProjectCodePlatformStatus.Draft,
      isActive: dto.isActive ?? true,
      notes: this.cleanString(dto.notes),
    });

    const populated = await this.populateQuery(
      this.projectCodePlatformModel.findById(created._id),
    ).lean();

    return ProjectCodePlatformMapper.toResponse(populated);
  }

  async findMyProjectPlatforms(
    userId: string,
  ): Promise<ProjectCodePlatformResponseDto[]> {
    const company = await this.getMyCompanyProvider(userId);

    const projects = await this.codeProjectModel
      .find({
        companyProviderId: company._id,
      })
      .select('_id')
      .lean();

    const projectIds = projects.map((p: any) => p._id);

    const list = await this.populateQuery(
      this.projectCodePlatformModel.find({
        codeProjectId: { $in: projectIds },
      }),
    )
      .sort({ createdAt: -1 })
      .lean();

    return ProjectCodePlatformMapper.toResponseList(list);
  }

  async findMyProjectPlatformById(
    userId: string,
    id: string,
  ): Promise<ProjectCodePlatformResponseDto> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id);

    const projects = await this.codeProjectModel
      .find({
        companyProviderId: company._id,
      })
      .select('_id')
      .lean();

    const projectIds = projects.map((p: any) => p._id);

    const doc = await this.populateQuery(
      this.projectCodePlatformModel.findOne({
        _id,
        codeProjectId: { $in: projectIds },
      }),
    ).lean();

    if (!doc) {
      throw new NotFoundException('Project platform not found');
    }

    return ProjectCodePlatformMapper.toResponse(doc);
  }

  async updateMyProjectPlatform(
    userId: string,
    id: string,
    dto: UpdateProjectCodePlatformDto,
  ): Promise<ProjectCodePlatformResponseDto> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id);

    const projects = await this.codeProjectModel
      .find({
        companyProviderId: company._id,
      })
      .select('_id')
      .lean();

    const projectIds = projects.map((p: any) => p._id);

    const existing = await this.projectCodePlatformModel
      .findOne({
        _id,
        codeProjectId: { $in: projectIds },
      })
      .lean();

    if (!existing) {
      throw new NotFoundException('Project platform not found');
    }

    const update: any = {};

    if (dto.platformId !== undefined) {
      await this.ensurePlatform(dto.platformId);

      const platformId = this.toObjectId(dto.platformId);

      const duplicate = await this.projectCodePlatformModel.exists({
        _id: { $ne: _id },
        codeProjectId: existing.codeProjectId,
        platformId,
      });

      if (duplicate) {
        throw new ConflictException(
          'This project is already assigned to this platform',
        );
      }

      update.platformId = platformId;
    }

    if (dto.deliveryMode !== undefined) {
      update.deliveryMode = dto.deliveryMode;
    }

    if (dto.runtimeMode !== undefined) {
      update.runtimeMode = dto.runtimeMode;
    }

    if (dto.status !== undefined) {
      update.status = dto.status;
    }

    if (dto.isActive !== undefined) {
      update.isActive = dto.isActive;
    }

    if (dto.notes !== undefined) {
      update.notes = this.cleanString(dto.notes);
    }

    const updated = await this.populateQuery(
      this.projectCodePlatformModel.findOneAndUpdate(
        {
          _id,
          codeProjectId: { $in: projectIds },
        },
        update,
        {
          new: true,
          runValidators: true,
        },
      ),
    ).lean();

    if (!updated) {
      throw new NotFoundException('Project platform not found');
    }

    return ProjectCodePlatformMapper.toResponse(updated);
  }

  async removeMyProjectPlatform(
    userId: string,
    id: string,
  ): Promise<{ deleted: boolean }> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id);

    const projects = await this.codeProjectModel
      .find({
        companyProviderId: company._id,
      })
      .select('_id')
      .lean();

    const projectIds = projects.map((p: any) => p._id);

    const deleted = await this.projectCodePlatformModel.findOneAndDelete({
      _id,
      codeProjectId: { $in: projectIds },
    });

    if (!deleted) {
      throw new NotFoundException('Project platform not found');
    }

    return { deleted: true };
  }

  async findAll(params?: {
    active?: boolean;
    codeProjectId?: string;
    platformId?: string;
  }): Promise<ProjectCodePlatformResponseDto[]> {
    const filter: any = {};

    if (typeof params?.active === 'boolean') {
      filter.isActive = params.active;
    }

    if (params?.codeProjectId) {
      filter.codeProjectId = this.toObjectId(params.codeProjectId);
    }

    if (params?.platformId) {
      filter.platformId = this.toObjectId(params.platformId);
    }

    const list = await this.populateQuery(
      this.projectCodePlatformModel.find(filter),
    )
      .sort({ createdAt: -1 })
      .lean();

    return ProjectCodePlatformMapper.toResponseList(list);
  }

  async findOne(id: string): Promise<ProjectCodePlatformResponseDto> {
    const _id = this.toObjectId(id);

    const doc = await this.populateQuery(
      this.projectCodePlatformModel.findById(_id),
    ).lean();

    if (!doc) {
      throw new NotFoundException('Project platform not found');
    }

    return ProjectCodePlatformMapper.toResponse(doc);
  }

  async deactivate(id: string): Promise<{ deactivated: boolean }> {
    const _id = this.toObjectId(id);

    const updated = await this.projectCodePlatformModel.findByIdAndUpdate(
      _id,
      {
        isActive: false,
        status: ProjectCodePlatformStatus.Archived,
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Project platform not found');
    }

    return { deactivated: true };
  }

  async findAvailableForClient(): Promise<ProjectCodePlatformResponseDto[]> {
    const list = await this.populateQuery(
      this.projectCodePlatformModel.find({
        isActive: true,
        status: ProjectCodePlatformStatus.Published,
      }),
    )
      .sort({ createdAt: -1 })
      .lean();

    return ProjectCodePlatformMapper.toResponseList(
      (list ?? []).filter((item: any) => {
        return (
          item?.platform?.isActive === true &&
          item?.platform?.isSupported === true
        );
      }),
    );
  }
}
