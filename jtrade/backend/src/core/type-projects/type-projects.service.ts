import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  TypeProject,
  TypeProjectDocument,
} from './schemas/type-project.schema';

import { CreateTypeProjectDto } from './dto/create-type-project.dto';
import { UpdateTypeProjectDto } from './dto/update-type-project.dto';
import { TypeProjectResponseDto } from './dto/type-project-response.dto';
import { TypeProjectMapper } from './mappers/type-project.mapper';

@Injectable()
export class TypeProjectsService {
  constructor(
    @InjectModel(TypeProject.name)
    private readonly typeProjectModel: Model<TypeProjectDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid type project id');
    }

    return new Types.ObjectId(id);
  }

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private cleanString(value?: string): string | undefined {
    const clean = value?.trim();
    return clean || undefined;
  }

  async create(dto: CreateTypeProjectDto): Promise<TypeProjectResponseDto> {
    const key = this.normalizeKey(dto.key);

    const exists = await this.typeProjectModel.exists({ key }).lean();

    if (exists) {
      throw new ConflictException('Type project key already exists');
    }

    const doc = await this.typeProjectModel.create({
      key,
      name: dto.name.trim(),
      description: this.cleanString(dto.description) ?? '',
      isActive: dto.isActive ?? true,
    });

    return TypeProjectMapper.toResponse(doc);
  }

  async findAll(): Promise<TypeProjectResponseDto[]> {
    const list = await this.typeProjectModel.find().sort({ name: 1 }).lean();

    return TypeProjectMapper.toResponseList(list);
  }

  async findActive(): Promise<TypeProjectResponseDto[]> {
    const list = await this.typeProjectModel
      .find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    return TypeProjectMapper.toResponseList(list);
  }

  async findOne(id: string): Promise<TypeProjectResponseDto> {
    const _id = this.toObjectId(id);

    const doc = await this.typeProjectModel.findById(_id).lean();

    if (!doc) {
      throw new NotFoundException('Type project not found');
    }

    return TypeProjectMapper.toResponse(doc);
  }

  async update(
    id: string,
    dto: UpdateTypeProjectDto,
  ): Promise<TypeProjectResponseDto> {
    const _id = this.toObjectId(id);

    const update: any = {};

    if (dto.key !== undefined) {
      const key = this.normalizeKey(dto.key);

      const exists = await this.typeProjectModel
        .exists({
          _id: { $ne: _id },
          key,
        })
        .lean();

      if (exists) {
        throw new ConflictException('Type project key already exists');
      }

      update.key = key;
    }

    if (dto.name !== undefined) {
      update.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      update.description = this.cleanString(dto.description) ?? '';
    }

    if (dto.isActive !== undefined) {
      update.isActive = dto.isActive;
    }

    const updated = await this.typeProjectModel
      .findByIdAndUpdate(_id, update, {
        new: true,
        runValidators: true,
      })
      .lean();

    if (!updated) {
      throw new NotFoundException('Type project not found');
    }

    return TypeProjectMapper.toResponse(updated);
  }

  async deactivate(id: string): Promise<{ deactivated: boolean }> {
    const _id = this.toObjectId(id);

    const updated = await this.typeProjectModel.findByIdAndUpdate(
      _id,
      { isActive: false },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Type project not found');
    }

    return { deactivated: true };
  }

  async seedDefaults(): Promise<{ seeded: boolean; count: number }> {
    const defaults = [
      {
        key: 'bot',
        name: 'Bot',
        description: 'Automated trading bot or expert advisor.',
      },
      {
        key: 'indicator',
        name: 'Indicator',
        description: 'Trading indicator used to generate signals or analysis.',
      },
      {
        key: 'strategy',
        name: 'Strategy',
        description: 'Trading strategy or rule-based system.',
      },
      {
        key: 'script',
        name: 'Script',
        description: 'Downloadable script or utility.',
      },
      {
        key: 'signal_provider',
        name: 'Signal Provider',
        description: 'Project that provides trading signals.',
      },
      {
        key: 'copy_trading',
        name: 'Copy Trading',
        description: 'Project related to copying trades from another source.',
      },
    ];

    let count = 0;

    for (const item of defaults) {
      const result = await this.typeProjectModel.updateOne(
        { key: item.key },
        {
          $setOnInsert: {
            ...item,
            isActive: true,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) count++;
    }

    return { seeded: true, count };
  }
}
