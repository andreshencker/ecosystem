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
  CompanyProvider,
  CompanyProviderDocument,
  CompanyProviderStatus,
} from './schemas/company-provider.schema';

import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

import { CreateCompanyProviderDto } from './dto/create-company-provider.dto';
import { UpdateCompanyProviderDto } from './dto/update-company-provider.dto';

import { CompanyProviderResponseDto } from './dto/company-provider-response.dto';

import { CompanyProviderMapper } from './mappers/company-provider.mapper';

@Injectable()
export class CompanyProvidersService {
  constructor(
    @InjectModel(CompanyProvider.name)
    private readonly companyProviderModel: Model<CompanyProviderDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) {
      return id;
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    return new Types.ObjectId(id);
  }

  private cleanString(value?: string): string | undefined {
    const clean = value?.trim();
    return clean || undefined;
  }

  async createMyCompany(
    userId: string,
    dto: CreateCompanyProviderDto,
  ): Promise<CompanyProviderResponseDto> {
    const ownerUserId = this.toObjectId(userId);

    const user = await this.userModel.findById(ownerUserId).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException('Only provider users can create companies');
    }

    const exists = await this.companyProviderModel.exists({
      ownerUserId,
      isActive: true,
    });

    if (exists) {
      throw new ConflictException('Provider already has a company');
    }

    const company = await this.companyProviderModel.create({
      ownerUserId,

      companyName: dto.companyName.trim(),

      legalName: this.cleanString(dto.legalName),

      email: this.cleanString(dto.email)?.toLowerCase(),

      phone: this.cleanString(dto.phone),

      website: this.cleanString(dto.website),

      logoUrl: this.cleanString(dto.logoUrl),

      description: this.cleanString(dto.description),

      status: CompanyProviderStatus.Pending,

      isVerified: false,

      isActive: true,
    });

    return CompanyProviderMapper.toResponse(company);
  }

  async findMyCompany(
    userId: string,
  ): Promise<CompanyProviderResponseDto | null> {
    const ownerUserId = this.toObjectId(userId);

    const company = await this.companyProviderModel
      .findOne({
        ownerUserId,
        isActive: true,
      })
      .lean()
      .exec();

    if (!company) {
      return null;
    }

    return CompanyProviderMapper.toResponse(company);
  }

  async updateMyCompany(
    userId: string,
    dto: UpdateCompanyProviderDto,
  ): Promise<CompanyProviderResponseDto> {
    const ownerUserId = this.toObjectId(userId);

    const update: any = {};

    if (dto.companyName !== undefined) {
      update.companyName = dto.companyName.trim();
    }

    if (dto.legalName !== undefined) {
      update.legalName = this.cleanString(dto.legalName) ?? '';
    }

    if (dto.email !== undefined) {
      update.email = this.cleanString(dto.email)?.toLowerCase() ?? '';
    }

    if (dto.phone !== undefined) {
      update.phone = this.cleanString(dto.phone) ?? '';
    }

    if (dto.website !== undefined) {
      update.website = this.cleanString(dto.website) ?? '';
    }

    if (dto.logoUrl !== undefined) {
      update.logoUrl = this.cleanString(dto.logoUrl) ?? '';
    }

    if (dto.description !== undefined) {
      update.description = this.cleanString(dto.description) ?? '';
    }

    const updated = await this.companyProviderModel
      .findOneAndUpdate(
        {
          ownerUserId,
          isActive: true,
        },
        update,
        {
          new: true,
          runValidators: true,
        },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException('Company provider not found');
    }

    return CompanyProviderMapper.toResponse(updated);
  }

  async findAll(): Promise<CompanyProviderResponseDto[]> {
    const companies = await this.companyProviderModel
      .find()
      .sort({ createdAt: -1 })
      .lean();

    return CompanyProviderMapper.toResponseList(companies);
  }

  async findOne(id: string): Promise<CompanyProviderResponseDto> {
    const _id = this.toObjectId(id);

    const company = await this.companyProviderModel.findById(_id).lean();

    if (!company) {
      throw new NotFoundException('Company provider not found');
    }

    return CompanyProviderMapper.toResponse(company);
  }

  async deactivate(id: string): Promise<{ deactivated: boolean }> {
    const _id = this.toObjectId(id);

    const updated = await this.companyProviderModel.findByIdAndUpdate(
      _id,
      { isActive: false },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Company provider not found');
    }

    return { deactivated: true };
  }
}
