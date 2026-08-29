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
  CodeProject,
  CodeProjectDocument,
  CodeProjectStatus,
} from './schemas/code-project.schema';

import { CreateCodeProjectDto } from './dto/create-code-project.dto';
import { UpdateCodeProjectDto } from './dto/update-code-project.dto';
import { CodeProjectResponseDto } from './dto/code-project-response.dto';
import { CodeProjectMapper } from './mappers/code-project.mapper';

import {
  CompanyProvider,
  CompanyProviderDocument,
} from '../company-provider/schemas/company-provider.schema';

import {
  TypeProduct,
  TypeProductDocument,
} from '../type-products/schemas/type-product.schema';

@Injectable()
export class CodeProjectsService {
  constructor(
    @InjectModel(CodeProject.name)
    private readonly codeProjectModel: Model<CodeProjectDocument>,

    @InjectModel(CompanyProvider.name)
    private readonly companyProviderModel: Model<CompanyProviderDocument>,

    @InjectModel(TypeProduct.name)
    private readonly typeProjectModel: Model<TypeProductDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    return new Types.ObjectId(id);
  }

  private normalizeKey(value: string): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
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

  private async ensureActiveTypeProject(typeProjectId: string): Promise<void> {
    const _id = this.toObjectId(typeProjectId);

    const exists = await this.typeProjectModel.exists({
      _id,
      isActive: true,
    });

    if (!exists) {
      throw new BadRequestException('Invalid or inactive type project');
    }
  }

  async createMyProject(
    userId: string,
    dto: CreateCodeProjectDto,
  ): Promise<CodeProjectResponseDto> {
    const company = await this.getMyCompanyProvider(userId);
    await this.ensureActiveTypeProject(dto.typeProjectId);

    const companyProviderId = company._id;
    const typeProjectId = this.toObjectId(dto.typeProjectId);
    const projectKey = this.normalizeKey(dto.projectKey);

    const exists = await this.codeProjectModel.exists({
      companyProviderId,
      projectKey,
    });

    if (exists) {
      throw new ConflictException(
        'Project key already exists for this company',
      );
    }

    const created = await this.codeProjectModel.create({
      companyProviderId,
      typeProjectId,
      projectKey,
      name: this.cleanString(dto.name),
      description: this.cleanString(dto.description),
      status: CodeProjectStatus.Draft,
      isActive: dto.isActive ?? true,
    });

    const populated = await this.codeProjectModel
      .findById(created._id)
      .populate('companyProvider', 'companyName')
      .populate('typeProject', 'key name')
      .lean();

    return CodeProjectMapper.toResponse(populated);
  }

  async findMyProjects(userId: string): Promise<CodeProjectResponseDto[]> {
    const company = await this.getMyCompanyProvider(userId);

    const list = await this.codeProjectModel
      .find({
        companyProviderId: company._id,
      })
      .populate('companyProvider', 'companyName')
      .populate('typeProject', 'key name')
      .sort({ createdAt: -1 })
      .lean();

    return CodeProjectMapper.toResponseList(list);
  }

  async findMyProjectById(
    userId: string,
    id: string,
  ): Promise<CodeProjectResponseDto> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id);

    const doc = await this.codeProjectModel
      .findOne({
        _id,
        companyProviderId: company._id,
      })
      .populate('companyProvider', 'companyName')
      .populate('typeProject', 'key name')
      .lean();

    if (!doc) {
      throw new NotFoundException('Code project not found');
    }

    return CodeProjectMapper.toResponse(doc);
  }

  async updateMyProject(
    userId: string,
    id: string,
    dto: UpdateCodeProjectDto,
  ): Promise<CodeProjectResponseDto> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id);

    const update: any = {};

    if (dto.typeProjectId !== undefined) {
      await this.ensureActiveTypeProject(dto.typeProjectId);
      update.typeProjectId = this.toObjectId(dto.typeProjectId);
    }

    if (dto.projectKey !== undefined) {
      const projectKey = this.normalizeKey(dto.projectKey);

      const exists = await this.codeProjectModel.exists({
        _id: { $ne: _id },
        companyProviderId: company._id,
        projectKey,
      });

      if (exists) {
        throw new ConflictException(
          'Project key already exists for this company',
        );
      }

      update.projectKey = projectKey;
    }

    if (dto.name !== undefined) {
      update.name = this.cleanString(dto.name);
    }

    if (dto.description !== undefined) {
      update.description = this.cleanString(dto.description);
    }

    if (dto.status !== undefined) {
      update.status = dto.status;
    }

    if (dto.isActive !== undefined) {
      update.isActive = dto.isActive;
    }

    const updated = await this.codeProjectModel
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
      .populate('companyProvider', 'companyName')
      .populate('typeProject', 'key name')
      .lean();

    if (!updated) {
      throw new NotFoundException('Code project not found');
    }

    return CodeProjectMapper.toResponse(updated);
  }

  async removeMyProject(
    userId: string,
    id: string,
  ): Promise<{ deleted: boolean }> {
    const company = await this.getMyCompanyProvider(userId);
    const _id = this.toObjectId(id);

    const deleted = await this.codeProjectModel.findOneAndDelete({
      _id,
      companyProviderId: company._id,
    });

    if (!deleted) {
      throw new NotFoundException('Code project not found');
    }

    return { deleted: true };
  }

  async findAll(params?: {
    active?: boolean;
    companyProviderId?: string;
    typeProjectId?: string;
  }): Promise<CodeProjectResponseDto[]> {
    const filter: any = {};

    if (typeof params?.active === 'boolean') {
      filter.isActive = params.active;
    }

    if (params?.companyProviderId) {
      filter.companyProviderId = this.toObjectId(params.companyProviderId);
    }

    if (params?.typeProjectId) {
      filter.typeProjectId = this.toObjectId(params.typeProjectId);
    }

    const list = await this.codeProjectModel
      .find(filter)
      .populate('companyProvider', 'companyName')
      .populate('typeProject', 'key name')
      .sort({ createdAt: -1 })
      .lean();

    return CodeProjectMapper.toResponseList(list);
  }

  async findOne(id: string): Promise<CodeProjectResponseDto> {
    const _id = this.toObjectId(id);

    const doc = await this.codeProjectModel
      .findById(_id)
      .populate('companyProvider', 'companyName')
      .populate('typeProject', 'key name')
      .lean();

    if (!doc) {
      throw new NotFoundException('Code project not found');
    }

    return CodeProjectMapper.toResponse(doc);
  }

  async deactivate(id: string): Promise<{ deactivated: boolean }> {
    const _id = this.toObjectId(id);

    const updated = await this.codeProjectModel.findByIdAndUpdate(
      _id,
      {
        isActive: false,
        status: CodeProjectStatus.Archived,
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Code project not found');
    }

    return { deactivated: true };
  }
}
