import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { TypeProduct, TypeProductDocument } from './schemas/type-product.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { RelayStorageService } from '../../integrations/relay/relay-storage.service';

import { CreateTypeProductDto } from './dto/create-type-product.dto';
import { UpdateTypeProductDto } from './dto/update-type-product.dto';
import { TypeProductResponseDto } from './dto/type-product-response.dto';
import { TypeProductMapper } from './mappers/type-product.mapper';

interface Actor {
  grapiflyUserId: string;
}

@Injectable()
export class TypeProductsService {
  constructor(
    @InjectModel(TypeProduct.name)
    private readonly typeProductModel: Model<TypeProductDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly relayStorage: RelayStorageService,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid type product id');
    return new Types.ObjectId(id);
  }

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  private clean(value?: string): string {
    return (value ?? '').trim();
  }

  private countUsage(typeId: Types.ObjectId) {
    return this.productModel.countDocuments({ typeProductId: typeId });
  }

  // ── create / read ─────────────────────────────────────────────────────────

  async create(dto: CreateTypeProductDto, actor: Actor): Promise<TypeProductResponseDto> {
    const key = this.normalizeKey(dto.key);
    if (key.length < 2) throw new BadRequestException('Key must be at least 2 characters');

    if (await this.typeProductModel.exists({ key }).lean()) {
      throw new ConflictException('Type product key already exists');
    }

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const last = await this.typeProductModel.findOne().sort({ displayOrder: -1 }).select('displayOrder').lean();
      displayOrder = (last?.displayOrder ?? -1) + 1;
    }

    const doc = await this.typeProductModel.create({
      key,
      name: dto.name.trim(),
      shortDescription: this.clean(dto.shortDescription),
      description: this.clean(dto.description),
      iconUrl: this.clean(dto.iconUrl),
      isActive: dto.isActive ?? true,
      displayOrder,
      createdByGrapiflyUserId: actor.grapiflyUserId,
      updatedByGrapiflyUserId: actor.grapiflyUserId,
    });

    return TypeProductMapper.toResponse(doc);
  }

  async findAll(): Promise<TypeProductResponseDto[]> {
    const list = await this.typeProductModel.find().sort({ displayOrder: 1, name: 1 }).lean();
    return TypeProductMapper.toResponseList(list);
  }

  async findActive(): Promise<TypeProductResponseDto[]> {
    const list = await this.typeProductModel
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    return TypeProductMapper.toResponseList(list);
  }

  async findOne(id: string): Promise<TypeProductResponseDto> {
    const doc = await this.typeProductModel.findById(this.toObjectId(id)).lean();
    if (!doc) throw new NotFoundException('Type product not found');
    return TypeProductMapper.toResponse(doc);
  }

  // ── update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateTypeProductDto, actor: Actor): Promise<TypeProductResponseDto> {
    const _id = this.toObjectId(id);
    const update: Record<string, unknown> = { updatedByGrapiflyUserId: actor.grapiflyUserId };

    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.shortDescription !== undefined) update.shortDescription = this.clean(dto.shortDescription);
    if (dto.description !== undefined) update.description = this.clean(dto.description);
    if (dto.iconUrl !== undefined) update.iconUrl = this.clean(dto.iconUrl);
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (dto.displayOrder !== undefined) update.displayOrder = dto.displayOrder;

    const updated = await this.typeProductModel
      .findByIdAndUpdate(_id, update, { new: true, runValidators: true })
      .lean();
    if (!updated) throw new NotFoundException('Type product not found');
    return TypeProductMapper.toResponse(updated);
  }

  /** Assigns displayOrder = index for the supplied ordered id list. */
  async reorder(orderedIds: string[], actor: Actor): Promise<TypeProductResponseDto[]> {
    const ops = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: this.toObjectId(id) },
        update: { $set: { displayOrder: index, updatedByGrapiflyUserId: actor.grapiflyUserId } },
      },
    }));
    if (ops.length) await this.typeProductModel.bulkWrite(ops);
    return this.findAll();
  }

  async setIcon(id: string, file: Express.Multer.File | undefined, actor: Actor): Promise<TypeProductResponseDto> {
    if (!file) throw new BadRequestException('file is required');
    const _id = this.toObjectId(id);
    const exists = await this.typeProductModel.exists({ _id }).lean();
    if (!exists) throw new NotFoundException('Type product not found');

    const url = await this.relayStorage.uploadTypeProductIcon(file);
    const updated = await this.typeProductModel
      .findByIdAndUpdate(_id, { $set: { iconUrl: url, updatedByGrapiflyUserId: actor.grapiflyUserId } }, { new: true })
      .lean();
    return TypeProductMapper.toResponse(updated);
  }

  // ── delete ────────────────────────────────────────────────────────────────

  /**
   * Physical delete is allowed ONLY for a type no product references (a
   * mistyped catalogue entry). Otherwise it is blocked — deactivate instead,
   * so existing products never end up orphaned.
   */
  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectId(id);
    const usage = await this.countUsage(_id);
    if (usage > 0) {
      throw new ConflictException(
        `This type is used by ${usage} product${usage > 1 ? 's' : ''}. Deactivate it instead of deleting it.`,
      );
    }
    const deleted = await this.typeProductModel.findByIdAndDelete(_id);
    if (!deleted) throw new NotFoundException('Type product not found');
    return { deleted: true };
  }
}
