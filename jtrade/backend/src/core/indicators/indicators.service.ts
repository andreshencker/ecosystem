import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { Indicator, IndicatorDocument } from './schemas/indicator.schema';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';

import {
  CompanyProvider,
  CompanyProviderDocument,
} from '../company-provider/schemas/company-provider.schema';

@Injectable()
export class IndicatorsService {
  private readonly companyProviderPopulate = {
    path: 'companyProviderId',
    select: 'companyName email status isVerified isActive',
  };

  constructor(
    @InjectModel(Indicator.name)
    private readonly model: Model<IndicatorDocument>,

    @InjectModel(CompanyProvider.name)
    private readonly companyProviderModel: Model<CompanyProviderDocument>,
  ) {}

  async create(dto: CreateIndicatorDto): Promise<IndicatorDocument> {
    const companyProviderId = this.toObjectId(dto.companyProviderId);
    const name = dto.name.trim();
    const key = dto.key.trim().toLowerCase();

    const companyProvider = await this.companyProviderModel
      .findOne({
        _id: companyProviderId,
        isActive: true,
      })
      .select('_id')
      .lean()
      .exec();

    if (!companyProvider) {
      throw new NotFoundException('Company provider not found');
    }

    const exists = await this.model
      .findOne({
        companyProviderId,
        $or: [{ name }, { key }],
      } as FilterQuery<Indicator>)
      .select('_id')
      .lean()
      .exec();

    if (exists) {
      throw new ConflictException(
        'Indicator already exists for this company provider',
      );
    }

    try {
      const created = await this.model.create({
        companyProviderId,
        name,
        key,
        description: dto.description?.trim() ?? '',
        isActive: typeof dto.isActive === 'boolean' ? dto.isActive : true,
      });

      return this.model
        .findById(created._id)
        .populate(this.companyProviderPopulate)
        .lean()
        .exec() as any;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException(
          'Indicator already exists for this company provider',
        );
      }

      throw e;
    }
  }

  async list(params?: {
    companyProviderId?: string;
    isActive?: boolean;
  }): Promise<IndicatorDocument[]> {
    const filter: FilterQuery<Indicator> = {};

    if (params?.companyProviderId) {
      filter.companyProviderId = this.toObjectId(params.companyProviderId);
    }

    if (typeof params?.isActive === 'boolean') {
      filter.isActive = params.isActive;
    }

    return this.model
      .find(filter)
      .sort({ isActive: -1, name: 1 })
      .populate(this.companyProviderPopulate)
      .lean()
      .exec() as any;
  }

  async getById(id: string): Promise<IndicatorDocument> {
    const _id = this.toObjectId(id);

    const doc = await this.model
      .findById(_id)
      .populate(this.companyProviderPopulate)
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException('Indicator not found');
    }

    return doc as any;
  }

  async update(
    id: string,
    dto: UpdateIndicatorDto,
  ): Promise<IndicatorDocument> {
    const _id = this.toObjectId(id);

    const current = await this.model
      .findById(_id)
      .select('companyProviderId')
      .lean()
      .exec();

    if (!current) {
      throw new NotFoundException('Indicator not found');
    }

    const update: Partial<Indicator> = {};

    if (dto.name) {
      update.name = dto.name.trim();
    }

    if (dto.key) {
      update.key = dto.key.trim().toLowerCase();
    }

    if (typeof dto.description === 'string') {
      update.description = dto.description.trim();
    }

    if (typeof dto.isActive === 'boolean') {
      update.isActive = dto.isActive;
    }

    if (Object.keys(update).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    try {
      const doc = await this.model
        .findByIdAndUpdate(_id, { $set: update }, { new: true })
        .populate(this.companyProviderPopulate)
        .lean()
        .exec();

      if (!doc) {
        throw new NotFoundException('Indicator not found');
      }

      return doc as any;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException(
          'Indicator name/key already exists for this company provider',
        );
      }

      throw e;
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectId(id);

    const res = await this.model.deleteOne({ _id }).exec();

    if (res.deletedCount === 0) {
      throw new NotFoundException('Indicator not found');
    }

    return { deleted: true };
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    return new Types.ObjectId(id);
  }
}
