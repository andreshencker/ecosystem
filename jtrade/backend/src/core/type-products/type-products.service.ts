import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  TypeProduct,
  TypeProductDocument,
} from './schemas/type-product.schema';

import { CreateTypeProductDto } from './dto/create-type-product.dto';
import { UpdateTypeProductDto } from './dto/update-type-product.dto';
import { TypeProductResponseDto } from './dto/type-product-response.dto';
import { TypeProductMapper } from './mappers/type-product.mapper';

@Injectable()
export class TypeProductsService {
  constructor(
    @InjectModel(TypeProduct.name)
    private readonly typeProductModel: Model<TypeProductDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid type product id');
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

  async create(dto: CreateTypeProductDto): Promise<TypeProductResponseDto> {
    const key = this.normalizeKey(dto.key);

    const exists = await this.typeProductModel.exists({ key }).lean();

    if (exists) {
      throw new ConflictException('Type product key already exists');
    }

    const doc = await this.typeProductModel.create({
      key,
      name: dto.name.trim(),
      description: this.cleanString(dto.description) ?? '',
      isActive: dto.isActive ?? true,
    });

    return TypeProductMapper.toResponse(doc);
  }

  async findAll(): Promise<TypeProductResponseDto[]> {
    const list = await this.typeProductModel.find().sort({ name: 1 }).lean();

    return TypeProductMapper.toResponseList(list);
  }

  async findActive(): Promise<TypeProductResponseDto[]> {
    const list = await this.typeProductModel
      .find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    return TypeProductMapper.toResponseList(list);
  }

  async findOne(id: string): Promise<TypeProductResponseDto> {
    const _id = this.toObjectId(id);

    const doc = await this.typeProductModel.findById(_id).lean();

    if (!doc) {
      throw new NotFoundException('Type product not found');
    }

    return TypeProductMapper.toResponse(doc);
  }

  async update(
    id: string,
    dto: UpdateTypeProductDto,
  ): Promise<TypeProductResponseDto> {
    const _id = this.toObjectId(id);

    const update: any = {};

    if (dto.key !== undefined) {
      const key = this.normalizeKey(dto.key);

      const exists = await this.typeProductModel
        .exists({
          _id: { $ne: _id },
          key,
        })
        .lean();

      if (exists) {
        throw new ConflictException('Type product key already exists');
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

    const updated = await this.typeProductModel
      .findByIdAndUpdate(_id, update, {
        new: true,
        runValidators: true,
      })
      .lean();

    if (!updated) {
      throw new NotFoundException('Type product not found');
    }

    return TypeProductMapper.toResponse(updated);
  }

  async deactivate(id: string): Promise<{ deactivated: boolean }> {
    const _id = this.toObjectId(id);

    const updated = await this.typeProductModel.findByIdAndUpdate(
      _id,
      { isActive: false },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Type product not found');
    }

    return { deactivated: true };
  }

  async seedDefaults(): Promise<{ seeded: boolean; count: number }> {
    const defaults = [
      {
        key: 'bots',
        name: 'Bots',
        description: 'Automated trading bots and expert advisors.',
      },
      {
        key: 'signals',
        name: 'Signals',
        description: 'Products that provide trading signals or alerts.',
      },
    ];

    let count = 0;

    for (const item of defaults) {
      const result = await this.typeProductModel.updateOne(
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
